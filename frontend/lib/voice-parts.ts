// The agent sometimes ends a reply with a stray "<" or half a tag. It is not part of the answer, so it is dropped
// before the reply is shown or spoken.
export const cleanReply = (text: string): string => text.replace(/\s*<[a-z_/-]*\s*$/i, '').trim();

// Parts the assistant names in a sentence, in the order they are said (at most three). A part matches by its full
// label, or by its last word when that word is long enough to be specific ("Pelton runner" also matches "runner").
export function partsMentioned(parts: { id: string; label: string }[] | null, text: string): string[] {
  if (!parts) return [];
  const said = text.toLowerCase();
  const hits: { id: string; at: number }[] = [];
  for (const c of parts) {
    const label = c.label.toLowerCase();
    const words = label.split(/\s+/);
    const terms = [label, words[words.length - 1]].filter((t) => t.length >= 5);
    const at = Math.min(...terms.map((t) => said.indexOf(t)).filter((i) => i >= 0));
    if (Number.isFinite(at)) hits.push({ id: c.id, at });
  }
  return hits
    .sort((a, b) => a.at - b.at)
    .slice(0, 3)
    .map((h) => h.id);
}
