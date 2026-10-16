import "dotenv/config";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

async function main() {
  const { text } = await generateText({
    model: groq("qwen/qwen3.8-27b"),
    prompt:
      "You are a business analyst. In three bullet points, explain what a business analyst does.",
  });

  console.log(text);
}

main().catch(console.error);
