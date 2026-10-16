import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM_PROMPT = `You are an expert Business Analyst with 15+ years of experience across multiple industries.
You help users with:
- Writing and refining user stories and acceptance criteria
- Analyzing and mapping business processes (current-state and future-state)
- Evaluating project feasibility and identifying risks
- Creating requirements documentation (BRD, FRD, use cases)
- Stakeholder analysis and communication strategies
- Data analysis and KPI definition

Be concise but thorough. Ask clarifying questions when requirements are ambiguous.
Use business analysis frameworks and best practices in your responses.
Format your responses clearly using bullet points, numbered lists, or sections where appropriate.`;

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const result = streamText({
      model: groq("qwen/qwen3.8-27b"),
      system: SYSTEM_PROMPT,
      messages,
    });

    for await (const chunk of result.textStream) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`\x1b[1m\x1b[35m╔════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m║      Business Analyst AI Assistant     ║\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m╚════════════════════════════════════════╝\x1b[0m`);
  console.log(`\x1b[32m✓\x1b[0m Server running at \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[90m  Open the URL above in your browser to start chatting.\x1b[0m\n`);
});
