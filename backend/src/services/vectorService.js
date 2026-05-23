import { ChromaClient } from "chromadb";

const COLLECTION_NAME = "shopease-faqs";

let client = null;
let collection = null;

function getClient() {
  if (!client) {
    const url = process.env.CHROMA_URL || "http://localhost:8000";
    console.log(`[VectorService] Connecting to ChromaDB at ${url}...`);
    client = new ChromaClient({ path: url });
  }

  return client;
}

async function getCollection() {
  if (!collection) {
    const c = getClient();

    console.log(
      `[VectorService] Getting/creating collection "${COLLECTION_NAME}"...`
    );

    collection = await c.getOrCreateCollection({
      name: COLLECTION_NAME,
    });

    console.log("[VectorService] Collection ready.");
  }

  return collection;
}

export async function testConnection() {
  try {
    const col = await getCollection();
    const count = await col.count();

    console.log(
      `[VectorService] testConnection OK — docs: ${count}`
    );

    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      error: error.message,
    };
  }
}

export async function storeChunks(chunks, embeddings) {
  const col = await getCollection();

  await col.upsert({
    ids: chunks.map((c) => c.id),
    documents: chunks.map((c) => c.text),
    embeddings,
    metadatas: chunks.map((c) => ({
      source: c.source || "",
    })),
  });

  console.log(
    `[VectorService] Stored ${chunks.length} chunks`
  );
}

export async function queryVector(embedding, topK = 3) {
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
}

export async function getDocumentCount() {
  const col = await getCollection();
  return col.count();
}