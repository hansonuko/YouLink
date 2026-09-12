/**
 * Lightweight spam heuristic run before inserting a chat message
 * (BLUEPRINT.md §6: "basic profanity/URL-spam heuristic before insert").
 * Deliberately not a trained model or third-party moderation API — just
 * enough to blunt the obvious bot-flood shapes (link spam, keyboard-mash
 * repetition) without false-positiving on normal conversation.
 */
export function looksLikeSpam(body: string): boolean {
  const urlCount = (body.match(/https?:\/\//gi) ?? []).length;
  if (urlCount >= 3) return true;

  // 10+ of the same character in a row (e.g. "aaaaaaaaaaaa" or "!!!!!!!!!!!!").
  if (/(.)\1{9,}/.test(body)) return true;

  return false;
}
