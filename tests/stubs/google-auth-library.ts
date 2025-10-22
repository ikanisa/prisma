export type JwtAuthorizeOptions = {
  access_token?: string;
  token_type?: string;
  expiry_date?: number;
  scopes?: string[];
};

export class JWT {
  options: Record<string, unknown>;

  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
  }

  async authorize(): Promise<JwtAuthorizeOptions> {
    const scopes = Array.isArray(this.options?.scopes)
      ? [...(this.options.scopes as string[])]
      : [];

    return {
      access_token: 'stub-token',
      token_type: 'Bearer',
      expiry_date: Date.now() + 60_000,
      scopes,
    };
  }
}

export default { JWT };
