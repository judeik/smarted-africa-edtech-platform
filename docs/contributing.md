# Contributing to SmartEd Africa

## Development Setup

```bash
# Clone the repo
git clone <repo-url>
cd team-14-smarted-africa

# Backend
cd backend && cp .env.example .env && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && cp .env.example .env && npm install && npm run dev

# AI Service (separate terminal)
cd AI-ML && pip install -r requirements.txt
# Add OPENAI_API_KEY to AI-ML/.env
uvicorn openai_api:app --reload --port 8001
```

## Branch Strategy

- `main` — production deployments
- `develop` — integration branch
- Feature branches: `feat/<description>`
- Bug fixes: `fix/<description>`

## Pull Request Checklist

- [ ] Tests pass (`npm test` in backend)
- [ ] TypeScript builds without errors (`npm run build` in frontend)
- [ ] ESLint passes (`npm run lint` in frontend)
- [ ] New API endpoints documented in `/docs/api-reference.md`
- [ ] Sensitive data not committed (no `.env` files, no API keys)

## Code Style

- **Backend:** ESM (`import`/`export`), no `require()`, follow controller→service→model pattern
- **Frontend:** TypeScript strict mode, functional components, hooks only
- **Comments:** Only when WHY is non-obvious. Never explain WHAT.
- **Commit messages:** Imperative mood, reference issue number if applicable

## Environment Variables

Never commit real secrets. Use `.env.example` with placeholder values.

## Reporting Issues

Create a GitHub issue with:
1. Environment (OS, Node.js version, browser)
2. Steps to reproduce
3. Expected vs actual behavior
