// Ambient type overrides for modules without TypeScript definitions

declare module 'pgvector/pg' {
  import type { ClientBase } from 'pg';
  export function registerTypeParser(client: ClientBase): void;
  const _default: unknown;
  export default _default;
}

declare module 'pdf-parse' {
  import type { Buffer } from 'node:buffer';

  type PdfData = {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    text: string;
    version: string;
  };

  function pdfParse(data: Buffer | Uint8Array | ArrayBuffer, options?: Record<string, unknown>): Promise<PdfData>;
  export default pdfParse;
}

// Add additional stubs for other untyped modules as needed.
