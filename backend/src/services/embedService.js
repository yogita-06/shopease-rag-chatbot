import { pipeline } from "@xenova/transformers";

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.log("[EmbedService] Loading embedding model (Xenova/all-MiniLM-L6-v2)...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("[EmbedService] Model ready.");
  }
  return embedder;
}

/**
 * Generates embeddings for an array of text strings.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Array of 384-dim float embeddings
 */
export async function embedTexts(texts) {
  let model;
  try {
    model = await getEmbedder();
  } catch (err) {
    embedder = null; // reset so next request retries the model load
    throw new Error(`Embedding model failed to load: ${err.message}`);
  }

  const results = [];
  for (const text of texts) {
    try {
      const output = await model(text, { pooling: "mean", normalize: true });
      results.push(Array.from(output.data));
    } catch (err) {
      embedder = null;
      throw new Error(`Embedding inference failed: ${err.message}`);
    }
  }
  return results;
}
