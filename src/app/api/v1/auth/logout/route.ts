import { checkRequest, rateLimit } from "@/lib/auth-security";
import { clearAuthCookies, revokeRefresh, verifyAccess } from "@/lib/app-tokens";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await rateLimit(request, 10)) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!checkRequest(request)) return Response.json({ error: "CSRF or origin validation failed" }, { status: 403 });
  const cookie = request.headers.get("cookie") || "";
  const token = cookie.match(/(?:^|;\s*)access_token=([^;]+)/)?.[1];
  if (!token || !await verifyAccess(token)) return Response.json({ error: "Authentication required" }, { status: 401 });
  const refresh = cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/)?.[1];
  if (refresh) await revokeRefresh(refresh);
  const response = new Response(null, { status: 204 });
  for (const value of [...clearAuthCookies(), `csrf_token=; Path=/; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`]) response.headers.append("set-cookie", value);
  return response;
}
