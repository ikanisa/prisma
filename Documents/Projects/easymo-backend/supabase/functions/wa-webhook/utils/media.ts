import { WA_TOKEN } from "../config.ts";

const GRAPH_API_BASE = "https://graph.facebook.com/v20.0";

export interface WAMediaFile {
  data: Uint8Array;
  mimeType: string;
  fileName?: string;
}

export async function fetchWAMedia(mediaId: string): Promise<WAMediaFile> {
  if (!WA_TOKEN) {
    throw new Error("WA_TOKEN is not configured");
  }

  const metaRes = await fetch(`${GRAPH_API_BASE}/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
    },
  });

  if (!metaRes.ok) {
    const text = await metaRes.text();
    throw new Error(`Failed to fetch media metadata: ${metaRes.status} ${text}`);
  }

  const meta = await metaRes.json();
  const url = meta?.url as string | undefined;
  if (!url) {
    throw new Error("Media metadata missing url");
  }

  const fileRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
    },
  });

  if (!fileRes.ok) {
    const text = await fileRes.text();
    throw new Error(`Failed to download media: ${fileRes.status} ${text}`);
  }

  const arrayBuf = await fileRes.arrayBuffer();
  const mimeType = meta?.mime_type ?? fileRes.headers.get("content-type") ?? "application/octet-stream";
  const fileName = meta?.file_name as string | undefined;

  return {
    data: new Uint8Array(arrayBuf),
    mimeType,
    fileName,
  };
}

export function extOf(mime: string): string {
  const normalized = mime.toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("jpeg")) return "jpg";
  if (normalized.includes("jpg")) return "jpg";
  if (normalized.includes("pdf")) return "pdf";
  if (normalized.includes("heic")) return "heic";
  if (normalized.includes("gif")) return "gif";
  return "bin";
}
