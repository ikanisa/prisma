import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, logOiAction } from '@/lib/supabase';
import { ensureOrgAccess, HttpError, resolveCurrentUser } from '../../soc/_common';

function badRequest(message: string, init?: ResponseInit) {
  return NextResponse.json({ error: message }, { status: 400, ...init });
}

function handleAuthorizationError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error('Failed to authorize other information document request', error);
  return NextResponse.json({ error: 'Failed to authorize request.' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return badRequest('orgId and engagementId are required query parameters.');
  }

  const supabase = getServiceSupabase();

  try {
    const { userId } = await resolveCurrentUser(request, supabase);
    await ensureOrgAccess(supabase, orgId, userId, 'EMPLOYEE');
  } catch (error) {
    return handleAuthorizationError(error);
  }

  const { data, error } = await supabase
    .from('other_information_docs')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data ?? [] });
}

function extractPageCount(buffer: Buffer, fileName: string, mimeType: string | null): number | null {
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return null;
  }

  const text = buffer.toString('utf8');
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const orgId = formData.get('orgId');
  const engagementId = formData.get('engagementId');
  const actorId = formData.get('actorId');
  const status = formData.get('status');
  const titleValue = formData.get('title');
  const file = formData.get('file');

  if (typeof orgId !== 'string' || !orgId) {
    return badRequest('orgId is required.');
  }

  if (typeof engagementId !== 'string' || !engagementId) {
    return badRequest('engagementId is required.');
  }

  if (!(file instanceof File)) {
    return badRequest('A file upload is required.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const pageCount = extractPageCount(buffer, file.name, file.type || null);
  const docId = randomUUID();
  const supabase = getServiceSupabase();

  let userId: string;
  try {
    ({ userId } = await resolveCurrentUser(request, supabase));
    await ensureOrgAccess(supabase, orgId, userId, 'EMPLOYEE');
  } catch (error) {
    return handleAuthorizationError(error);
  }

  const resolvedActorId = typeof actorId === 'string' && actorId.length > 0 ? actorId : null;
  if (resolvedActorId && resolvedActorId !== userId) {
    return NextResponse.json({ error: 'actorId does not match the authenticated user.' }, { status: 403 });
  }

  const uploaderId = resolvedActorId ?? userId;

  const title = typeof titleValue === 'string' && titleValue.trim().length > 0 ? titleValue.trim() : file.name;
  const storagePath =
    typeof formData.get('storagePath') === 'string' && formData.get('storagePath')
      ? (formData.get('storagePath') as string)
      : `aat-intake/org/${orgId}/other-information/${docId}/${encodeURIComponent(file.name)}`;

  const [bucket, ...objectParts] = storagePath.split('/');
  if (!bucket || objectParts.length === 0) {
    return badRequest('storagePath must include a storage bucket and object key.');
  }
  const objectPath = objectParts.join('/');

  const metadata = {
    originalName: file.name,
    size: file.size,
    type: file.type,
    checksum,
    pageCount,
  };

  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message ?? 'Failed to store uploaded document.' },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from('other_information_docs')
    .insert({
      id: docId,
      org_id: orgId,
      engagement_id: engagementId,
      title,
      storage_path: storagePath,
      status: typeof status === 'string' && status ? status : 'uploaded',
      mime_type: file.type || null,
      file_size: file.size,
      checksum,
      metadata,
      uploaded_by: uploaderId,
    })
    .select()
    .single();

  if (error) {
    const cleanupResult = await supabase.storage.from(bucket).remove([objectPath]);
    if (cleanupResult.error) {
      console.error('Failed to clean up uploaded other information object after database error', cleanupResult.error);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logOiAction(supabase, {
    orgId,
    userId: uploaderId,
    action: 'OI_DOCUMENT_UPLOADED',
    entityId: docId,
    metadata: {
      title,
      checksum,
      size: file.size,
      pageCount,
    },
  });

  return NextResponse.json({ document: data, metadata }, { status: 201 });
}
