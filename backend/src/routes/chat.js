import { Router } from "express";
import { embedTexts } from "../services/embedService.js";
import { queryVector } from "../services/vectorService.js";
import { sendMessage } from "../services/groqService.js";

const router = Router();

const SYSTEM_PROMPT = `You are ShopEase support agent. Answer based on FAQ context. Be concise, India-focused (₹, COD, shipping). If answer not in context, say 'I don't have this information, contact support'.`;

// POST /api/chat
router.post("/chat", async (req, res) => {
  const { question } = req.body;
  console.log(`\n[CHAT] ── New request ──────────────────────────`);
  console.log(`[CHAT] Question: "${String(question ?? "").slice(0, 120)}"`);

  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      success: false,
      error: "Request body must include a non-empty 'question' string.",
    });
  }

  const q = question.trim();

  // ── Step 1: Generate embedding ────────────────────────────────
  console.log("[CHAT] Step 1: Generating embedding...");
  let questionEmbedding;
  try {
    [questionEmbedding] = await embedTexts([q]);
    console.log(`[CHAT] Embedding ready, dim: ${questionEmbedding.length}`);
  } catch (embedErr) {
    console.error("[CHAT] Embedding failed:", embedErr.message);
    return res.status(500).json({
      success: false,
      error: "Failed to process your question (embedding error). Please try again.",
    });
  }

  // ── Step 2: Query ChromaDB ────────────────────────────────────
  console.log("[CHAT] Step 2: Querying ChromaDB...");
  let results = [];
  let chromaOk = true;
  try {
    results = await queryVector(questionEmbedding, 3);
    console.log(`[CHAT] ChromaDB returned ${results.length} result(s)`);
  } catch (chromaErr) {
    chromaOk = false;
    console.error("[CHAT] ChromaDB unreachable:", chromaErr.message);
    console.warn("[CHAT] PRODUCTION NOTE: ChromaDB runs locally and is NOT available on Render.");
    console.warn("[CHAT] Fix: deploy a hosted ChromaDB (Zilliz / Chroma Cloud) and set CHROMA_URL.");
  }

  if (!chromaOk) {
    return res.json({
      success: true,
      answer:
        "I'm currently unable to access the knowledge base. " +
        "For immediate assistance, please contact ShopEase support directly.",
      sources: [],
    });
  }

  if (results.length === 0) {
    console.log("[CHAT] No matching documents found in ChromaDB.");
    return res.json({
      success: true,
      answer: "I don't have information on that topic. Please contact support for further help.",
      sources: [],
    });
  }

  // ── Step 3: Call Groq LLM ─────────────────────────────────────
  const context = results.map((r, i) => `[${i + 1}] ${r.text}`).join("\n\n");
  console.log("[CHAT] Step 3: Calling Groq LLM...");
  let answer;
  try {
    answer = await sendMessage([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `FAQ Context:\n${context}\n\nUser Question: ${q}` },
    ]);
    console.log(`[CHAT] LLM responded, answer length: ${answer?.length ?? 0} chars`);
  } catch (groqErr) {
    console.error("[CHAT] Groq LLM call failed:", groqErr.message);
    return res.status(500).json({
      success: false,
      error: "AI service is temporarily unavailable. Please try again in a moment.",
    });
  }

  const sources = [...new Set(results.map((r) => r.source).filter(Boolean))];
  console.log(`[CHAT] Done. Sources: [${sources.join(", ") || "none"}]`);
  res.json({ success: true, answer, sources });
});

export default router;
