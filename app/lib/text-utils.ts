export function sanitizeReply(value: string) {
  return value
    .replace(/\*\*|\*|`|#|_/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
