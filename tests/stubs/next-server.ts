export class NextResponse {
  static json(data: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  }
}
