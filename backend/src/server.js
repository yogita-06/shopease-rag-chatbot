import "dotenv/config";
import express from "express";
import cors from "cors";

import { sendMessage } from "./services/groqService.js";
import ingestRouter from "./routes/ingest.js";
import chatRouter from "./routes/chat.js";

const app = express();

const PORT = process.env.PORT || 3000;

/**
 * Middleware
 */
app.use(
  cors({
    origin: "*",
  })
);

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
  console.log(
    `🚀 ShopEase support server running on port ${PORT}`
  );
});