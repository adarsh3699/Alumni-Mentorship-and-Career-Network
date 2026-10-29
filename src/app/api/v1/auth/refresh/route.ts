import { checkRequest, rateLimit } from "@/lib/auth-security";
import { authCookies, rotateRefresh } from "@/lib/app-tokens";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await rateLimit(request, 10)) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!checkRequest(request)) return Response.json({ error: "CSRF or origin validation failed" }, { status: 403 });
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)refresh_token=([^;]+)/)?.[1];
  const rotated = token && await rotateRefresh(token);
  if (!rotated) return Response.json({ error: "Refresh token expired or invalid" }, { status: 401 });
  const response = new Response(null, { status: 204 });
  for (const cookie of authCookies(rotated.access, rotated.refresh)) response.headers.append("set-cookie", cookie);
  return response;
}
