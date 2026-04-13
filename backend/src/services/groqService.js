import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// messages = [{ role: "user" | "assistant" | "system", content: "..." }]
export async function sendMessage(messages) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
  });
  return completion.choices[0].message.content;
}
