import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('TenantClient when Supabase configured', () => {
  let supabaseFromMock: ReturnType<typeof vi.fn>;
  let selectMock: ReturnType<typeof vi.fn>;
  let selectEqMock: ReturnType<typeof vi.fn>;
  let maybeSingleMock: ReturnType<typeof vi.fn>;
  let insertMock: ReturnType<typeof vi.fn>;
  let updateMock: ReturnType<typeof vi.fn>;
  let updateEqMock: ReturnType<typeof vi.fn>;
  let deleteMock: ReturnType<typeof vi.fn>;
  let deleteEqMock: ReturnType<typeof vi.fn>;

  let createTenantClient: (orgId: string) => any;

  beforeEach(async () => {
    vi.resetModules();

    maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: 'record' } });
    const selectEqReturn = { maybeSingle: maybeSingleMock, marker: 'selectEqReturn' };
    selectEqMock = vi.fn().mockReturnValue(selectEqReturn);
    selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });

    insertMock = vi.fn().mockResolvedValue({ data: { id: 'inserted' } });
    updateEqMock = vi.fn().mockResolvedValue({ data: { id: 'updated' } });
    updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });
    deleteEqMock = vi.fn().mockResolvedValue({ data: { id: 'deleted' } });
    deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });

    supabaseFromMock = vi.fn().mockReturnValue({
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
    });

    vi.doMock('@/integrations/supabase/client', () => ({
      isSupabaseConfigured: true,
      supabase: {
        from: supabaseFromMock,
      },
    }));

    ({ createTenantClient } = await import('@/lib/tenant-client'));
  });

  afterEach(() => {
    vi.resetModules();
    vi.unmock('@/integrations/supabase/client');
  });

  it('selects records scoped to the organisation', () => {
    const client = createTenantClient('org-123');
    const result = client.select('clients');

    expect(supabaseFromMock).toHaveBeenCalledWith('clients');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(selectEqMock).toHaveBeenCalledWith('org_id', 'org-123');
    expect(result).toEqual({ maybeSingle: maybeSingleMock, marker: 'selectEqReturn' });
  });

  it('selects a single record via maybeSingle()', async () => {
    const client = createTenantClient('org-123');
    await client.selectSingle('engagements');

    expect(selectEqMock).toHaveBeenCalledWith('org_id', 'org-123');
    expect(maybeSingleMock).toHaveBeenCalled();
  });

  it('inserts records with org_id automatically attached', async () => {
    const client = createTenantClient('org-123');
    await client.insert('documents', { name: 'Doc' });

    expect(insertMock).toHaveBeenCalledWith({ name: 'Doc', org_id: 'org-123' });
  });

  it('updates and deletes are scoped by org_id', async () => {
    const client = createTenantClient('org-123');
    await client.update('notifications', { read: true });
    await client.delete('notifications');

    expect(updateMock).toHaveBeenCalledWith({ read: true });
    expect(updateEqMock).toHaveBeenCalledWith('org_id', 'org-123');
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEqMock).toHaveBeenCalledWith('org_id', 'org-123');
  });
});

describe('TenantClient fallback when Supabase not configured', () => {
  let createTenantClient: (orgId: string) => any;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('@/integrations/supabase/client', () => ({
      isSupabaseConfigured: false,
      supabase: {
        from: vi.fn(),
      },
    }));

    ({ createTenantClient } = await import('@/lib/tenant-client'));
  });

  afterEach(() => {
    vi.resetModules();
    vi.unmock('@/integrations/supabase/client');
  });

  it('returns error stubs when Supabase is disabled', async () => {
    const client = createTenantClient('org-123');
    const { error, status } = await client.select('clients');

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Supabase is not configured');
    expect(status).toBe(400);
  });
});
