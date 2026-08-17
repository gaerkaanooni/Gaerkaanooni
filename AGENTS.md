# AGENTS.md

This repository uses [DeepSeek Harness (`dsh`)](https://github.com/deepseek-ai/deepseek-harness) for autonomous agent operations.

## Repository Layout

```
Gaerkaanooni/
├── apps/              # Frontend & Web Applications (@pil/web)
├── packages/          # Shared packages (e.g. Prisma database schemas, utilities)
├── docs/              # Strategy, product planning, and technical documentation
├── scripts/           # Automation and setup scripts (e.g. database setup)
├── .agents/           # Agent skills and workflow configurations
└── AGENTS.md          # Agent operational rules & guidelines
```

## Agent Workflows & Commands

Agents using `dsh` or other tools should run commands using the repository scripts:

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run type checks
npm run typecheck

# Run linter
npm run lint

# Run test suite
npm run test

# Launch DeepSeek Harness Web UI
npm run dsh:web
```

## Environment & Secrets

- Real API credentials must be stored in `.env`. Refer to `.env.example` for required keys.
- **Never commit secrets** or `.env` files to git.
- `DEEPSEEK_API_KEY` is required when running `dsh` agent loops with DeepSeek models.

## Conventions & Rules

- Monorepo using npm workspaces (`apps/*`, `packages/*`).
- Typescript strict typechecking must pass cleanly (`npm run typecheck`).
- Code changes must pass linting (`npm run lint`) and testing (`npm run test`).
- Agent skills are maintained under `.agents/skills/`.
