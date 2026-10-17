import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { groq } from "@ai-sdk/groq";
import { streamText, stepCountIs } from "ai";
import { tool } from "ai";
import { z } from "zod";
import { zodSchema } from "ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(__dirname, "artifacts");

await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

// express and cors don't have types for v5 — cast to any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const app = express() as any;
app.use((cors as any)());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/artifacts", express.static(ARTIFACTS_DIR));

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Business Analyst AI Agent with 15+ years of experience.

You have access to the following tools — use them proactively when appropriate:
- saveArtifact: Save any BA document (user stories, BRDs, process maps, acceptance criteria) to a file
- listArtifacts: List all previously saved artifacts
- readArtifact: Read the content of a saved artifact
- generateTemplate: Fill in a structured BA template and save it

Guidelines:
- When asked to create or write any BA document, ALWAYS save it using saveArtifact or generateTemplate
- When asked what has been saved or created, use listArtifacts
- Be concise but thorough. Ask clarifying questions when requirements are ambiguous.
- Format responses clearly using bullet points, numbered lists, or sections.`;

// ─── Tools ───────────────────────────────────────────────────────────────────

const baTools = {
  saveArtifact: tool({
    description:
      "Save a business analysis artifact (user story, BRD, process map, acceptance criteria) to a markdown file. Use whenever you produce a document.",
    inputSchema: zodSchema(
      z.object({
        filename: z.string().describe("Filename without extension, kebab-case. E.g. 'user-stories-login'"),
        title: z.string().describe("Human-readable title of the document"),
        content: z.string().describe("Full markdown content of the artifact"),
      })
    ),
    execute: async ({ filename, title, content }) => {
      const safeFilename = filename.replace(/[^a-z0-9\-_]/gi, "-") + ".md";
      const filepath = path.join(ARTIFACTS_DIR, safeFilename);
      const markdown = `# ${title}\n\n_Saved by BA Agent on ${new Date().toLocaleString()}_\n\n---\n\n${content}`;
      await fs.writeFile(filepath, markdown, "utf-8");
      return {
        success: true,
        filename: safeFilename,
        path: `/artifacts/${safeFilename}`,
        message: `Saved "${title}" as ${safeFilename}`,
      };
    },
  }),

  listArtifacts: tool({
    description: "List all saved business analysis artifacts.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const files = await fs.readdir(ARTIFACTS_DIR);
      const mdFiles = files.filter((f) => f.endsWith(".md"));
      if (mdFiles.length === 0) {
        return { artifacts: [], message: "No artifacts saved yet." };
      }
      const artifacts = await Promise.all(
        mdFiles.map(async (f) => {
          const stat = await fs.stat(path.join(ARTIFACTS_DIR, f));
          return { filename: f, path: `/artifacts/${f}`, savedAt: stat.mtime.toLocaleString() };
        })
      );
      return { artifacts, message: `Found ${artifacts.length} artifact(s).` };
    },
  }),

  readArtifact: tool({
    description: "Read the content of a previously saved artifact by filename.",
    inputSchema: zodSchema(
      z.object({
        filename: z.string().describe("The filename to read, e.g. 'user-stories-login.md'"),
      })
    ),
    execute: async ({ filename }) => {
      const safeFilename = filename.endsWith(".md") ? filename : filename + ".md";
      const filepath = path.join(ARTIFACTS_DIR, safeFilename);
      try {
        const content = await fs.readFile(filepath, "utf-8");
        return { success: true, filename: safeFilename, content };
      } catch {
        return { success: false, message: `File "${safeFilename}" not found.` };
      }
    },
  }),

  generateTemplate: tool({
    description:
      "Generate a structured BA template and save it. Types: user-story, brd, acceptance-criteria, process-map, raci-matrix, kpi-framework.",
    inputSchema: zodSchema(
      z.object({
        templateType: z
          .enum(["user-story", "brd", "acceptance-criteria", "process-map", "raci-matrix", "kpi-framework"])
          .describe("The type of BA template to generate"),
        projectName: z.string().describe("Name of the project or feature"),
        details: z.string().describe("Key details or context to populate the template"),
      })
    ),
    execute: async ({ templateType, projectName, details }) => {
      const templates: Record<string, (n: string, d: string) => string> = {
        "user-story": (n, d) =>
          `## Project: ${n}\n\n${d}\n\n---\n| Field | Description |\n|-------|-------------|\n| As a | user role |\n| I want | goal |\n| So that | business value |`,
        "brd": (n, d) =>
          `## BRD — ${n}\n**Date:** ${new Date().toLocaleDateString()}\n\n### Summary\n${d}\n\n### Objectives\n- \n\n### Functional Requirements\n| ID | Requirement | Priority |\n|----|-------------|----------|\n| FR-001 | | High |`,
        "acceptance-criteria": (n, d) =>
          `## Acceptance Criteria — ${n}\n\n${d}\n\n---\n### Gherkin Format\n\`\`\`\nGiven [context]\nWhen [action]\nThen [outcome]\n\`\`\`\n\n### Definition of Done\n- [ ] Criteria pass\n- [ ] Reviewed\n- [ ] UAT sign-off`,
        "process-map": (n, d) =>
          `## Process Map — ${n}\n\n${d}\n\n### As-Is\n\`\`\`\nStart → Step 1 → Decision → Yes → Step 2 → End\n                          → No  → Step 3 → End\n\`\`\`\n\n### Pain Points\n- \n\n### To-Be\n\`\`\`\nStart → Improved Step 1 → End\n\`\`\``,
        "raci-matrix": (n, d) =>
          `## RACI Matrix — ${n}\n\n${d}\n\n| Activity | Owner A | Owner B | Owner C |\n|----------|---------|---------|----------|\n| Requirements | R | A | C |\n| Design | C | R | A |\n| Testing | A | C | R |\n\n**R**=Responsible **A**=Accountable **C**=Consulted **I**=Informed`,
        "kpi-framework": (n, d) =>
          `## KPI Framework — ${n}\n\n${d}\n\n| KPI | Target | Frequency | Owner |\n|-----|--------|-----------|-------|\n| | | Monthly | |\n\n**Financial:** \n**Operational:** \n**Customer:** `,
      };

      const render = templates[templateType];
      if (render === undefined) {
        return { success: false, message: `Unknown template type: ${templateType}` };
      }

      const content = render(projectName, details);
      const filename = `${templateType}-${projectName.toLowerCase().replace(/\s+/g, "-")}.md`;
      const markdown = `# ${templateType.replace(/-/g, " ").toUpperCase()} — ${projectName}\n\n_Generated by BA Agent on ${new Date().toLocaleString()}_\n\n---\n\n${content}`;
      await fs.writeFile(path.join(ARTIFACTS_DIR, filename), markdown, "utf-8");

      return {
        success: true,
        templateType,
        filename,
        path: `/artifacts/${filename}`,
        message: `Generated and saved ${templateType} for "${projectName}"`,
      };
    },
  }),
};

// ─── Artifacts listing endpoint ───────────────────────────────────────────────

app.get("/api/artifacts", async (_req: unknown, res: { json: (v: unknown) => void }) => {
  const files = await fs.readdir(ARTIFACTS_DIR);
  const mdFiles = (files as string[]).filter((f) => f.endsWith(".md"));
  const result = await Promise.all(
    mdFiles.map(async (f) => {
      const stat = await fs.stat(path.join(ARTIFACTS_DIR, f));
      return { filename: f, savedAt: stat.mtime.toLocaleString() };
    })
  );
  res.json({ files: result });
});

// ─── Chat API ─────────────────────────────────────────────────────────────────

app.post(
  "/api/chat",
  async (
    req: { body: { messages: unknown[] } },
    res: {
      setHeader: (k: string, v: string) => void;
      write: (s: string) => void;
      end: () => void;
    }
  ) => {
    const { messages } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
      const result = streamText({
        model: groq("qwen/qwen3.8-27b"),
        system: SYSTEM_PROMPT,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
        tools: baTools,
        stopWhen: stepCountIs(5),
      });

      for await (const part of result.stream) {
        switch (part.type) {
          case "text-delta":
            // v7: text delta is in part.text
            send({ type: "text", text: (part as unknown as { text: string }).text });
            break;
          case "tool-call":
            send({ type: "tool-call", toolName: part.toolName, args: part.input });
            break;
          case "tool-result":
            send({ type: "tool-result", toolName: part.toolName, result: part.output });
            break;
          case "error":
            send({ type: "error", message: String(part.error) });
            break;
        }
      }

      send({ type: "done" });
      res.end();
    } catch (err) {
      console.error(err);
      send({ type: "error", message: "Something went wrong on the server." });
      res.end();
    }
  }
);

// ─── Server ───────────────────────────────────────────────────────────────────

const PORT = process.env["PORT"] ?? 3000;
app.listen(PORT, () => {
  console.log(`\x1b[1m\x1b[35m╔═══════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m║    Business Analyst AI Agent 🤖            ║\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m╚═══════════════════════════════════════════╝\x1b[0m`);
  console.log(`\x1b[32m✓\x1b[0m Server running at \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[90m  Artifacts saved to: ${ARTIFACTS_DIR}\x1b[0m\n`);
});
