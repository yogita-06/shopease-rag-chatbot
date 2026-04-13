import "dotenv/config";
import express from "express";
import cors from "cors";
import { sendMessage } from "./services/groqService.js";
import ingestRouter from "./routes/ingest.js";
import chatRouter from "./routes/chat.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api", ingestRouter);
app.use("/api", chatRouter);

// GET /api/health — server aur env check karta hai
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// GET /api/test-groq — Groq API se ek test message bhejta hai
app.get("/api/test-groq", async (req, res) => {
  try {
    const reply = await sendMessage([
      {
        role: "user",
        content:
          "Say hello as a helpful customer support agent for ShopEase, an Indian online clothing store. One sentence only.",
      },
    ]);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`ShopEase support server running at http://localhost:${PORT}`);
});
