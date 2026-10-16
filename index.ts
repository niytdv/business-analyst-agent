import "dotenv/config";
import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";
import * as readline from "readline";

type Message = {
  role: "user" | "assistant";
  content: string;
};

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

const history: Message[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function chat(userMessage: string): Promise<void> {
  history.push({ role: "user", content: userMessage });

  process.stdout.write("\n\x1b[36mAssistant:\x1b[0m ");

  let fullResponse = "";

  const { textStream } = streamText({
    model: groq("qwen/qwen3.8-27b"),
    system: SYSTEM_PROMPT,
    messages: history,
  });

  for await (const chunk of textStream) {
    process.stdout.write(chunk);
    fullResponse += chunk;
  }

  process.stdout.write("\n\n");

  history.push({ role: "assistant", content: fullResponse });
}

async function main() {
  console.log("\x1b[1m\x1b[35m╔════════════════════════════════════════╗\x1b[0m");
  console.log("\x1b[1m\x1b[35m║      Business Analyst AI Assistant     ║\x1b[0m");
  console.log("\x1b[1m\x1b[35m╚════════════════════════════════════════╝\x1b[0m");
  console.log('\x1b[90mType your message and press Enter to chat.');
  console.log('Type "exit" or "quit" to end the session.\x1b[0m\n');

  while (true) {
    const input = await ask("\x1b[32mYou:\x1b[0m ");
    const trimmed = input.trim();

    if (!trimmed) continue;

    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
      console.log("\n\x1b[90mEnding session. Goodbye!\x1b[0m");
      rl.close();
      break;
    }

    await chat(trimmed);
  }
}

main().catch(console.error);
