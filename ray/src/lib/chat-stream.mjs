export function parseChatErrorLine(line) {
  if (!line.startsWith("3:")) return undefined;

  const payload = line.slice(2).trim();
  if (!payload) return "Error generating response";

  try {
    const parsed = JSON.parse(payload);
    return typeof parsed === "string" ? parsed : payload;
  } catch {
    return payload;
  }
}
