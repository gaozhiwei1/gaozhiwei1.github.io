export class AuthenticationError extends Error {
  constructor(code, message, status = 401) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
    this.status = status;
  }
}

export function bearerToken(request) {
  const authorization = request.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

export function createAuthService(supabase) {
  return {
    async authenticate(request) {
      const token = bearerToken(request);
      if (!token)
        throw new AuthenticationError("missing_token", "需要登录后继续");
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user)
        throw new AuthenticationError("invalid_token", "登录状态无效或已过期");
      return { user: data.user, token };
    },
  };
}
