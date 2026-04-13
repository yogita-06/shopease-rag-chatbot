# ShopEase AI Support Agent

A **Retrieval-Augmented Generation (RAG)** chatbot built for ShopEase — an Indian online clothing store. Instead of hallucinating answers, it retrieves the most relevant chunks from real FAQ documents, feeds them as context to a large language model, and returns accurate, grounded replies with source attribution.

The project is split into a Node.js/Express backend (embedding, vector search, LLM orchestration) and a React frontend (real-time chat UI with dark/light mode). Everything runs locally except for the Groq API call — no cloud vector database, no paid embedding service.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Node.js, Express 4 |
| Embeddings | `@xenova/transformers` — `all-MiniLM-L6-v2` (runs locally, 384-dim) |
| Vector Database | ChromaDB (local HTTP server) |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| Environment | dotenv |

---

## Features

- **RAG pipeline** — questions are embedded, matched against ChromaDB, and answered using only retrieved FAQ context
- **Source attribution** — every bot reply shows which FAQ file(s) the answer came from
- **Bulk ingestion** — one endpoint reads all files from `backend/data/` and loads them into ChromaDB automatically
- **Real-time chat UI** — typing indicator, auto-scroll, auto-resizing textarea
- **Dark / Light mode** — toggle in the header, defaults to dark
- **Suggested questions** — quick-start prompts shown on the welcome screen
- **Copy to clipboard** — copy any bot answer with one click
- **India-focused prompting** — system prompt tuned for ₹, COD, and Indian shipping context

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│  (Vite dev server · localhost:5173)                  │
└────────────────────┬────────────────────────────────┘
                     │  POST /api/chat { question }
                     ▼
┌─────────────────────────────────────────────────────┐
│                 Express Backend                      │
│  (Node.js · localhost:3000)                          │
│                                                      │
│  1. Embed question                                   │
│     @xenova/transformers · all-MiniLM-L6-v2          │
│                  │                                   │
│  2. Vector search (top 3 chunks)                     │
│     ChromaDB client  ──►  ChromaDB server            │
│                           localhost:8000             │
│                  │                                   │
│  3. Build prompt (system + FAQ context + question)   │
│                  │                                   │
│  4. LLM call                                         │
│     Groq API  ──►  llama-3.3-70b-versatile           │
│                  │                                   │
│  5. Return { answer, sources }                       │
└─────────────────────────────────────────────────────┘

Ingestion (one-time setup):
backend/data/*.md|.txt
        │
   chunkText()          ← paragraph-level chunking (max 600 chars)
        │
   embedTexts()         ← all-MiniLM-L6-v2 (local)
        │
   ChromaDB upsert      ← collection: shopease-faqs
```

---

## Project Structure

```
support-agent/
├── backend/
│   ├── data/                      # FAQ source documents
│   │   ├── shopease-faq.txt
│   │   ├── return-policy.md
│   │   ├── shipping-info.md
│   │   ├── sizing-guide.md
│   │   ├── payment-methods.md
│   │   ├── order-tracking.md
│   │   ├── exchanges.md
│   │   ├── discount-codes.md
│   │   └── contact-info.md
│   ├── src/
│   │   ├── routes/
│   │   │   ├── chat.js            # POST /api/chat
│   │   │   └── ingest.js          # POST /api/ingest, POST /api/ingest/all
│   │   ├── services/
│   │   │   ├── embedService.js    # @xenova/transformers wrapper
│   │   │   ├── groqService.js     # Groq SDK wrapper
│   │   │   └── vectorService.js   # ChromaDB client (store + query)
│   │   ├── utils/
│   │   │   └── chunker.js         # Paragraph + sentence chunker
│   │   └── server.js              # Express app entry point
│   ├── .env                       # Local secrets (not committed)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Full chat UI (single component)
│   │   └── main.jsx               # React entry point
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## Installation

### Prerequisites

- **Node.js** v18 or later
- **Python** 3.8+ (ChromaDB requires it)
- **pip** (to install ChromaDB)
- A free **Groq API key** — get one at [console.groq.com](https://console.groq.com)

---

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd support-agent
```

---

### 2. Backend setup

```bash
cd backend
npm install
```

Create your `.env` file:

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
CHROMA_URL=http://localhost:8000
```

> The `@xenova/transformers` embedding model (`all-MiniLM-L6-v2`) downloads automatically on first use (~23 MB). No manual setup needed.

---

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

---

### 4. ChromaDB setup

Install ChromaDB via pip (once):

```bash
pip install chromadb
```

---

## Running the Project

You need **three terminals** running at the same time.

**Terminal 1 — ChromaDB vector database**

```bash
chroma run --path ./chroma-data
# Starts ChromaDB at http://localhost:8000
```

> Run this from any directory. `./chroma-data` is where ChromaDB persists its data — it will be created automatically.

**Terminal 2 — Backend**

```bash
cd support-agent/backend
npm run dev
# Starts Express at http://localhost:3000
```

**Terminal 3 — Frontend**

```bash
cd support-agent/frontend
npm run dev
# Starts Vite dev server at http://localhost:5173
```

Open your browser at **http://localhost:5173**.

---

### Load FAQ data into ChromaDB (first run only)

Before the chatbot can answer questions, you must ingest the FAQ files:

```bash
curl -X POST http://localhost:3000/api/ingest/all
```

Expected response:

```json
{
  "success": true,
  "totalChunksStored": 227,
  "chromaTotal": 227,
  "files": [
    { "file": "contact-info.md", "chunks": 29 },
    { "file": "return-policy.md", "chunks": 21 },
    ...
  ]
}
```

Verify the collection:

```bash
curl http://localhost:3000/api/ingest/status
# { "count": 227 }
```

You only need to run ingestion once (ChromaDB persists data to disk). Re-run it any time you add or update files in `backend/data/`.

---

## API Endpoints

### `POST /api/chat`

Ask the chatbot a question. Embeds the question, retrieves top-3 FAQ chunks from ChromaDB, and sends them to Groq for a grounded answer.

**Request body:**
```json
{ "question": "What is the return policy?" }
```

**Response:**
```json
{
  "question": "What is the return policy?",
  "answer": "ShopEase offers a 30-day return policy for unused items in original packaging...",
  "sources": ["return-policy.md"]
}
```

---

### `POST /api/ingest`

Ingest a single piece of text manually.

**Request body:**
```json
{
  "text": "Free shipping on orders above ₹999.",
  "source": "shipping-info.md"
}
```

**Response:**
```json
{ "success": true, "chunksStored": 1 }
```

---

### `POST /api/ingest/all`

Reads every file from `backend/data/`, chunks, embeds, and upserts them all into ChromaDB in one call.

**Response:**
```json
{
  "success": true,
  "totalChunksStored": 227,
  "chromaTotal": 227,
  "files": [{ "file": "return-policy.md", "chunks": 21 }, ...]
}
```

---

### `GET /api/ingest/status`

Returns the total number of documents currently stored in ChromaDB.

**Response:**
```json
{ "count": 227 }
```

---

### `GET /api/health`

Quick server liveness check.

**Response:**
```json
{ "status": "ok", "time": "2025-01-01T00:00:00.000Z" }
```

---

### `GET /api/test-groq`

Sends a test message to the Groq API to verify your API key and connection.

**Response:**
```json
{ "reply": "Namaste! I'm the ShopEase support agent, here to help!" }
```

---

## Adding New FAQ Content

1. Create a new `.md` or `.txt` file in `backend/data/`
2. Re-run ingestion:
   ```bash
   curl -X POST http://localhost:3000/api/ingest/all
   ```
3. ChromaDB uses upsert — existing chunks are updated, new ones are added. No duplicates.

---

## Future Improvements

- **Streaming responses** — stream Groq tokens to the frontend for a faster perceived response time
- **Multi-language support** — detect query language and respond in Hindi, Bengali, Tamil, etc.
- **Conversation memory** — pass recent message history to the LLM for multi-turn context
- **Analytics dashboard** — log questions, track unanswered queries, identify FAQ gaps
- **Admin panel** — upload/manage FAQ files from a browser UI instead of the filesystem
- **Reranking** — add a cross-encoder reranker step between vector retrieval and LLM to improve answer quality
- **Docker Compose** — single `docker compose up` to start ChromaDB, backend, and frontend together

---

## License

MIT License — free to use, modify, and distribute.

---

## Author

Built by **Yogita** — AI automation enthusiast passionate about building practical LLM applications.
