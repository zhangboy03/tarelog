export function chatCompletionsEndpoint(baseUrl: string) {
  const clean = baseUrl.trim().replace(/\/+$/, "");
  return clean.endsWith("/chat/completions") ? clean : `${clean}/chat/completions`;
}
