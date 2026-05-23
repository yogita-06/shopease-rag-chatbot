import { Router } from "express";
import { embedTexts } from "../services/embedService.js";
import { queryVector } from "../services/vectorService.js";
import { sendMessage } from "../services/groqService.js";

const router = Router();

const SYSTEM_PROMPT = `You are ShopEase support agent. Answer based on FAQ context. Be concise, India-focused (₹, COD, shipping). If answer not in context, say 'I don't have this information, contact support'.`;

// POST /api/chat
router.post("/chat", async (req, res) => {
  console.log("[CHAT ROUTE HIT]", req.body);

  const { question } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({ success: false, error: "Request body must include a 'question' string." });
  }

  try {
    // 1. Generate embedding for user question
    const [questionEmbedding] = await embedTexts([question]);

    // 2. Search ChromaDB for top 3 similar FAQ chunks
    const results = await queryVector(questionEmbedding, 3);

    if (results.length === 0) {
      return res.json({
        success: true,
        answer: "I don't have this information, contact support.",
        sources: [],
      });
    }

    // 3. Build context string from search results
    const context = results.map((r, i) => `[${i + 1}] ${r.text}`).join("\n\n");

    // 4. Send to Groq with system prompt + context
    const answer = await sendMessage([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `FAQ Context:\n${context}\n\nUser Question: ${question}`,
      },
    ]);

    // 5. Deduplicate non-empty source names
    const sources = [
      ...new Set(results.map((r) => r.source).filter(Boolean)),
    ];

    res.json({ success: true, answer, sources });
  } catch (err) {
    console.error("[/api/chat] Error:", err.message);
    res.status(500).json({ success: false, error: "Failed to process your question. Please try again." });
  }
});

export default router;
