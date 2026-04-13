import { ChromaClient } from "chromadb";

const COLLECTION_NAME = "shopease-faqs";
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";

console.log(`[VectorService] ChromaDB URL: ${CHROMA_URL}`);
console.log(`[VectorService] Collection name: ${COLLECTION_NAME}`);

let client = null;
let collection = null;

function getClient() {
  if (!client) {
    console.log(`[VectorService] Creating ChromaDB client at ${CHROMA_URL}`);
    client = new ChromaClient({ path: CHROMA_URL });
  }
  return client;
}

async function getCollection() {
  if (!collection) {
    const c = getClient();
    console.log(`[VectorService] Getting/creating collection "${COLLECTION_NAME}"...`);
    collection = await c.getOrCreateCollection({ name: COLLECTION_NAME });
    console.log(`[VectorService] Collection ready.`);
  }
  return collection;
}

/**
 * Verifies the ChromaDB server is reachable and the collection is accessible.
 */
export async function testConnection() {
  const c = getClient();
  const version = await c.version();
  console.log(`[VectorService] ChromaDB server version: ${version}`);
  const col = await getCollection();
  const count = await col.count();
  console.log(`[VectorService] testConnection OK — current doc count: ${count}`);
  return { version, count };
}

/**
 * Upserts chunks and their embeddings into ChromaDB.
 * @param {Array<{ id: string, text: string, source?: string }>} chunks
 * @param {number[][]} embeddings
 */
export async function storeChunks(chunks, embeddings) {
  const col = await getCollection();
  console.log(`[VectorService] storeChunks() called with ${chunks.length} chunks`);
  console.log(`[VectorService] IDs: ${chunks.map((c) => c.id).join(", ")}`);

  await col.upsert({
    ids: chunks.map((c) => c.id),
    documents: chunks.map((c) => c.text),
    embeddings,
    metadatas: chunks.map((c) => ({ source: c.source || "" })),
  });

  const newCount = await col.count();
  console.log(`[VectorService] upsert done — collection now has ${newCount} docs`);
}

/**
 * Retrieves the top-K most relevant chunks for a query embedding.
 * @param {number[]} embedding
 * @param {number} topK
 * @returns {Promise<Array<{ text: string, source: string }>>} Array of matching chunks with source metadata
 */
export async function queryVector(embedding, topK = 3) {
  const col = await getCollection();
  const results = await col.query({
    queryEmbeddings: [embedding],
    nResults: topK,
    include: ["documents", "metadatas"],
  });

  const documents = results.documents[0] || [];
  const metadatas = results.metadatas[0] || [];

  return documents.map((text, i) => ({
    text,
    source: metadatas[i]?.source || null,
  }));
}

/**
 * Returns the total number of documents stored in the collection.
 * @returns {Promise<number>}
 */
export async function getDocumentCount() {
  const col = await getCollection();
  return col.count();
}
