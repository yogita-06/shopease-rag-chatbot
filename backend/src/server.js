import "dotenv/config";
import express from "express";
import cors from "cors";

import { sendMessage } from "./services/groqService.js";
import ingestRouter from "./routes/ingest.js";
import chatRouter from "./routes/chat.js";

// Validate required env vars before binding the port
if (!process.env.GROQ_API_KEY) {
  console.error(
    "[Server] GROQ_API_KEY is not set.\n" +
    "  Local: add it to backend/.env\n" +
    "  Render: set it in the service dashboard → Environment"
  );
  process.exit(1);
}

const app = express();

const PORT = process.env.PORT || 3000;

// Allow an explicit list in production, fall back to wildcard for local dev
const corsOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:4173"]
  : "*";

app.use(cors({ origin: corsOrigins }));

app.use(express.json());

/**
 * Root Route
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShopEase AI Support Backend Running 🚀",
    status: "online",
    timestamp: new Date(),
  });
});

/**
 * Health Check Route
 */
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

/**
 * Groq API Test Route
 */
app.get("/api/test-groq", async (req, res) => {
  try {
    const reply = await sendMessage([
      {
        role: "user",
        content:
          "Say hello as a helpful customer support agent for ShopEase, an Indian online clothing store. One sentence only.",
      },
    ]);

    res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("[/api/test-groq] Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * API Routes
 */
app.use("/api", ingestRouter);
app.use("/api", chatRouter);

/**
 * 404 Route Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error("[Server Error]", err);

  res.status(500).json({
    success: false,
    error: "Internal Server Error",
  });
});

/**
 * Start Server
 */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] ShopEase support running on port ${PORT}`);
  console.log(`[Server] GROQ model: llama-3.3-70b-versatile`);
  console.log(`[Server] CHROMA_URL: ${process.env.CHROMA_URL || "http://localhost:8000 (default)"}`);
  console.log(`[Server] CORS origin: ${JSON.stringify(corsOrigins)}`);
});