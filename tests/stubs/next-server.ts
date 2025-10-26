export class NextResponse {
  static json(data: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers ?? {});
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    return new Response(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers,
    });
  }
}
