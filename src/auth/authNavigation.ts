const AUTH_RETURN_KEY = "math2llm-auth-return";

export function rememberAuthReturn(
  path = window.location.hash.replace(/^#/, "") || "/map",
) {
  if (
    !["/login", "/signup", "/auth/callback"].some((route) =>
      path.startsWith(route),
    )
  ) {
    sessionStorage.setItem(AUTH_RETURN_KEY, path);
  }
}

export function consumeAuthReturn(fallback = "/account") {
  const path = sessionStorage.getItem(AUTH_RETURN_KEY) ?? fallback;
  sessionStorage.removeItem(AUTH_RETURN_KEY);
  return path;
}
