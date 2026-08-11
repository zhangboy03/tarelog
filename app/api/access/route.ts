import { accessConfigured, expiredSessionCookie, sessionCookie, verifyAccessToken } from "@/lib/access";

export async function POST(request: Request) {
  if (!accessConfigured()) return Response.json({ error: "APP_ACCESS_TOKEN is not configured for this deployment." }, { status: 503 });
  const body = await request.json() as { token?: unknown };
  if (!await verifyAccessToken(String(body.token || ""))) {
    return Response.json({ error: "The access token is not valid." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": await sessionCookie(request) } });
}

export async function DELETE(request: Request) {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": expiredSessionCookie(request) } });
}
