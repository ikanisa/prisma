export type JwtAuthorizeOptions = {
  access_token?: string;
  token_type?: string;
  expiry_date?: number;
  scopes?: string[];
};

export class JWT {
  email?: string;
  key?: string;
  scopes: string[];

  constructor(options: { email?: string; key?: string; scopes?: string[] } = {}) {
    this.email = options.email;
    this.key = options.key;
    this.scopes = Array.isArray(options.scopes) ? [...options.scopes] : [];
  }

  async authorize(): Promise<JwtAuthorizeOptions> {
    return {
      access_token: 'stub-token',
      token_type: 'Bearer',
      expiry_date: Date.now() + 60_000,
      scopes: [...this.scopes],
    };
  }
}

export default { JWT };
