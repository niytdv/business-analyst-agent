# Business Analyst AI Assistant

An AI-powered Business Analyst assistant built with the [Vercel AI SDK](https://sdk.vercel.ai/) and [Groq](https://groq.com/). Chat with an expert BA persona that helps you write user stories, map processes, define KPIs, and more — all streamed in real time through a clean web UI.

## Features

- 💬 **Streaming chat UI** — responses appear word-by-word in the browser
- 🧠 **Expert BA persona** — system prompt tuned for business analysis tasks
- 📝 **Multi-turn memory** — full conversation history sent on every request
- ⚡ **Groq-powered** — fast inference via `qwen/qwen3.8-27b`
- 🌐 **Web frontend** — no framework, plain HTML/CSS/JS served by Express

## Tech Stack

- **Runtime:** Node.js + TypeScript (`tsx`)
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/groq`)
- **Server:** Express
- **Frontend:** Vanilla HTML/CSS/JS
- **LLM Provider:** Groq

## Project Structure

```
├── index.ts          # Express server + streaming chat API
├── public/
│   └── index.html    # Frontend chat UI
├── .env              # API keys (not committed)
├── package.json
└── tsconfig.json
```

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your free API key at [console.groq.com](https://console.groq.com/).

### 4. Run the server

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

## Usage

Type any business analysis question into the chat. Some things you can try:

- *"Write user stories for a login and registration feature"*
- *"Map the current invoice approval process and find bottlenecks"*
- *"Help me create acceptance criteria for a payment gateway"*
- *"What KPIs should I track for a customer support system?"*

## Commit History

The repo is structured with meaningful commits that show the evolution of the project:

| Commit | Description |
|--------|-------------|
| `chore: initial project setup` | `package.json`, `tsconfig.json`, `.gitignore` |
| `feat: add basic generateText script` | Single-prompt `generateText` call |
| `feat: add interactive streaming CLI chat` | Multi-turn CLI chat with `streamText` |
| `feat: add express server with chat API` | Express backend with SSE streaming endpoint |
| `feat: add frontend chat UI` | Vanilla HTML/CSS/JS chat interface |

## License

MIT
