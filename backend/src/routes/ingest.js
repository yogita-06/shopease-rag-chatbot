import { Router } from "express";
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { chunkText } from "../utils/chunker.js";
import { embedTexts } from "../services/embedService.js";
import { storeChunks, getDocumentCount, testConnection } from "../services/vectorService.js";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");

// POST /api/ingest — chunk, embed, and store FAQ text from request body
router.post("/ingest", async (req, res) => {
  const { text, source } = req.body;

  console.log(`\n[INGEST] POST /api/ingest called`);
  console.log(`[INGEST] source: ${source || "(none)"}`);
  console.log(`[INGEST] text length: ${text ? text.length : 0} chars`);

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Request body must include a 'text' string." });
  }

  const chunks = chunkText(text);
  console.log(`[INGEST] Chunks generated: ${chunks.length}`);

  if (chunks.length === 0) {
    return res.status(400).json({ error: "No content found after chunking." });
  }

  // Prefix each chunk ID with the source filename so multiple files don't overwrite each other.
  const idPrefix = source ? source.replace(/[^a-zA-Z0-9_-]/g, "_") : "chunk";
  const chunksWithSource = chunks.map((c, i) => ({
    ...c,
    id: `${idPrefix}_${i}`,
    source: source || "",
  }));

  console.log(`[INGEST] Generating embeddings for ${chunksWithSource.length} chunks...`);
  const embeddings = await embedTexts(chunksWithSource.map((c) => c.text));
  console.log(`[INGEST] Embeddings generated: ${embeddings.length} (dim: ${embeddings[0]?.length})`);

  console.log(`[INGEST] Storing chunks in ChromaDB...`);
  await storeChunks(chunksWithSource, embeddings);
  console.log(`[INGEST] Done. Stored ${chunksWithSource.length} chunks for source "${source}".`);

  res.json({ success: true, chunksStored: chunks.length });
});

// POST /api/ingest/all — read every file in backend/data/ and ingest them all
router.post("/ingest/all", async (req, res) => {
  console.log(`\n[INGEST/ALL] Starting bulk ingest from: ${DATA_DIR}`);

  // 1. Test ChromaDB connection first
  try {
    await testConnection();
    console.log(`[INGEST/ALL] ChromaDB connection OK`);
  } catch (err) {
    console.error(`[INGEST/ALL] ChromaDB connection FAILED:`, err.message);
    return res.status(500).json({ error: "ChromaDB connection failed", detail: err.message });
  }

  // 2. List files in data/
  let files;
  try {
    files = await readdir(DATA_DIR);
  } catch (err) {
    console.error(`[INGEST/ALL] Cannot read data dir "${DATA_DIR}":`, err.message);
    return res.status(500).json({ error: "Cannot read data directory", detail: err.message });
  }
  console.log(`[INGEST/ALL] Files found in backend/data/:`, files);

  if (files.length === 0) {
    return res.status(400).json({ error: "No files found in backend/data/" });
  }

  const results = [];
  let totalChunks = 0;

  // 3. Process each file
  for (const filename of files) {
    const filePath = join(DATA_DIR, filename);
    console.log(`\n[INGEST/ALL] --- Processing: ${filename} ---`);

    let text;
    try {
      text = await readFile(filePath, "utf-8");
      console.log(`[INGEST/ALL] Read ${text.length} chars from ${filename}`);
    } catch (err) {
      console.error(`[INGEST/ALL] Failed to read ${filename}:`, err.message);
      results.push({ file: filename, error: err.message });
      continue;
    }

    const chunks = chunkText(text);
    console.log(`[INGEST/ALL] Chunks generated for ${filename}: ${chunks.length}`);

    if (chunks.length === 0) {
      console.warn(`[INGEST/ALL] No chunks from ${filename}, skipping.`);
      results.push({ file: filename, chunks: 0 });
      continue;
    }

    const idPrefix = filename.replace(/[^a-zA-Z0-9_-]/g, "_");
    const chunksWithSource = chunks.map((c, i) => ({
      ...c,
      id: `${idPrefix}_${i}`,
      source: filename,
    }));

    // Log first 3 chunk previews
    chunksWithSource.slice(0, 3).forEach((c, i) => {
      console.log(`[INGEST/ALL]   chunk[${i}] id="${c.id}" preview: "${c.text.slice(0, 80)}..."`);
    });

    console.log(`[INGEST/ALL] Generating embeddings for ${chunksWithSource.length} chunks...`);
    let embeddings;
    try {
      embeddings = await embedTexts(chunksWithSource.map((c) => c.text));
      console.log(`[INGEST/ALL] Embeddings done: ${embeddings.length} vectors, dim=${embeddings[0]?.length}`);
    } catch (err) {
      console.error(`[INGEST/ALL] Embedding failed for ${filename}:`, err.message);
      results.push({ file: filename, error: `embedding: ${err.message}` });
      continue;
    }

    console.log(`[INGEST/ALL] Upserting ${chunksWithSource.length} docs into ChromaDB...`);
    try {
      await storeChunks(chunksWithSource, embeddings);
      console.log(`[INGEST/ALL] Stored ${chunksWithSource.length} chunks for ${filename}`);
      totalChunks += chunksWithSource.length;
      results.push({ file: filename, chunks: chunksWithSource.length });
    } catch (err) {
      console.error(`[INGEST/ALL] ChromaDB upsert failed for ${filename}:`, err.message);
      results.push({ file: filename, error: `chroma: ${err.message}` });
    }
  }

  const finalCount = await getDocumentCount();
  console.log(`\n[INGEST/ALL] Bulk ingest complete. Total new chunks: ${totalChunks}. ChromaDB total: ${finalCount}`);

  res.json({ success: true, totalChunksStored: totalChunks, chromaTotal: finalCount, files: results });
});

// GET /api/ingest/status — how many documents are stored
router.get("/ingest/status", async (req, res) => {
  const count = await getDocumentCount();
  console.log(`[INGEST/STATUS] ChromaDB doc count: ${count}`);
  res.json({ count });
});

export default router;
