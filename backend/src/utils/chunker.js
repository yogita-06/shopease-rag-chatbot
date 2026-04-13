const MAX_CHUNK_SIZE = 600;

/**
 * Splits a long paragraph at sentence boundaries to stay under MAX_CHUNK_SIZE.
 */
function splitLargeParagraph(text) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Splits raw FAQ text into vector-ready chunks.
 * @param {string} text - Raw FAQ content (plain text or markdown)
 * @returns {Array<{ id: string, text: string }>}
 */
export function chunkText(text) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (trimmed.length <= MAX_CHUNK_SIZE) {
      chunks.push(trimmed);
    } else {
      chunks.push(...splitLargeParagraph(trimmed));
    }
  }

  return chunks.map((text, i) => ({ id: `chunk_${i}`, text }));
}
