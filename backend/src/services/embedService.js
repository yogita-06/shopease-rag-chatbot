import { pipeline } from "@xenova/transformers";

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

/**
 * Generates embeddings for an array of text strings.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Array of 384-dim float embeddings
 */
export async function embedTexts(texts) {
  const model = await getEmbedder();
  const results = [];

  for (const text of texts) {
    const output = await model(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data));
  }

  return results;
}
