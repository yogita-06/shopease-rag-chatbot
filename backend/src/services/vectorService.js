import { ChromaClient } from "chromadb";

const COLLECTION_NAME = "shopease-faqs";

// IMPORTANT: use 127.0.0.1 instead of localhost
const CHROMA_URL =
  process.env.CHROMA_URL || "http://127.0.0.1:8000";

console.log(`[VectorService] ChromaDB URL: ${CHROMA_URL}`);
console.log(`[VectorService] Collection name: ${COLLECTION_NAME}`);

let client = null;
let collection = null;

/**
 * Create ChromaDB client
 */
function getClient() {
  if (!client) {
    console.log(
      `[VectorService] Creating ChromaDB client at ${CHROMA_URL}`
    );

    client = new ChromaClient({
      path: CHROMA_URL,
    });
  }

  return client;
}

/**
 * Get or create collection
 */
async function getCollection() {
  try {
    if (!collection) {
      const c = getClient();

      console.log(
        `[VectorService] Getting/creating collection "${COLLECTION_NAME}"...`
      );

      collection = await c.getOrCreateCollection({
        name: COLLECTION_NAME,
      });

      console.log(`[VectorService] Collection ready.`);
    }

    return collection;
  } catch (error) {
    console.error(
      `[VectorService] Failed to connect to ChromaDB`
    );

    console.error(error);

    throw new Error(
      `ChromaDB connection failed. Make sure Chroma server is running on ${CHROMA_URL}`
    );
  }
}

/**
 * Test ChromaDB connection
 */
export async function testConnection() {
  try {
    const c = getClient();

    console.log(`[VectorService] Testing ChromaDB connection...`);

    const version = await c.version();

    console.log(
      `[VectorService] ChromaDB server version: ${version}`
    );

    const col = await getCollection();

    const count = await col.count();

    console.log(
      `[VectorService] testConnection OK — current doc count: ${count}`
    );

    return {
      success: true,
      version,
      count,
    };
  } catch (error) {
    console.error(`[VectorService] testConnection FAILED`);
    console.error(error);

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Store chunks with embeddings
 */
export async function storeChunks(chunks, embeddings) {
  try {
    const col = await getCollection();

    console.log(
      `[VectorService] storeChunks() called with ${chunks.length} chunks`
    );

    await col.upsert({
      ids: chunks.map((c) => c.id),
      documents: chunks.map((c) => c.text),
      embeddings: embeddings,
      metadatas: chunks.map((c) => ({
        source: c.source || "unknown",
      })),
    });

    const newCount = await col.count();

    console.log(
      `[VectorService] Upsert successful — collection now has ${newCount} docs`
    );

    return {
      success: true,
      count: newCount,
    };
  } catch (error) {
    console.error(`[VectorService] storeChunks FAILED`);
    console.error(error);

    throw error;
  }
}

/**
 * Query vector database
 */
export async function queryVector(embedding, topK = 3) {
  try {
    const col = await getCollection();

    const results = await col.query({
      queryEmbeddings: [embedding],
      nResults: topK,
      include: ["documents", "metadatas"],
    });

    const documents = results.documents?.[0] || [];
    const metadatas = results.metadatas?.[0] || [];

    return documents.map((text, index) => ({
      text,
      source: metadatas[index]?.source || null,
    }));
  } catch (error) {
    console.error(`[VectorService] queryVector FAILED`);
    console.error(error);

    return [];
  }
}

/**
 * Get total document count
 */
export async function getDocumentCount() {
  try {
    const col = await getCollection();

    const count = await col.count();

    return count;
  } catch (error) {
    console.error(`[VectorService] getDocumentCount FAILED`);
    console.error(error);

    return 0;
  }
}