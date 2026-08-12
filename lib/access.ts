import { env } from "cloudflare:workers";

type AccessEnv = { APP_ACCESS_TOKEN?: string };

const runtime = env as unknown as AccessEnv;
export const accessCookieName = "tarelog_access";
const accessCookieMaxAge = 60 * 60 * 24 * 400;

function configuredToken() {
  const token = runtime.APP_ACCESS_TOKEN || process.env.APP_ACCESS_TOKEN || "";
  if (token.length < 24 || token.startsWith("replace-with-")) return "";
  return token;
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equal(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function cookieValue(request: Request) {
  const cookies = request.headers.get("cookie") || "";
  for (const item of cookies.split(";")) {
    const [name, ...parts] = item.trim().split("=");
    if (name === accessCookieName) return decodeURIComponent(parts.join("="));
  }
  return "";
}

export function accessConfigured() {
  return Boolean(configuredToken());
}

export async function verifyAccessToken(candidate: string) {
  const expected = configuredToken();
  if (!expected) return false;
  return equal(await digest(candidate), await digest(expected));
}

export async function accessCookie() {
  const token = configuredToken();
  return token ? digest(`tarelog:${token}`) : "";
}

export async function requestHasAccess(request: Request) {
  const expected = await accessCookie();
  return Boolean(expected) && equal(cookieValue(request), expected);
}

function accessError(error: string, code: string, status: number) {
  return Response.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function requireAppAccess(request: Request) {
  if (!accessConfigured()) return accessError("部署者还没有配置 APP_ACCESS_TOKEN。", "access_not_configured", 503);
  if (!await requestHasAccess(request)) return accessError("需要先验证此私人饮食记录的访问凭证。", "access_required", 401);
  return null;
}

export async function sessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${accessCookieName}=${await accessCookie()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${accessCookieMaxAge}${secure}`;
}

export function expiredSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${accessCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
