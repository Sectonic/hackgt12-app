# Repository Guidelines

## Project Structure & Module Organization
- `src/app` hosts Next.js routes, layouts, and API handlers.
- UI building blocks live in `src/components`; shared domain logic spans `src/cedar`, `src/managers`, `src/hooks`, and `src/utils`—match the existing separation when adding code.
- The Mastra backend runs from `src/backend/src`; its SQLite state and configs stay in the same folder.
- Static assets sit in `public`, and tooling configs (`next.config.ts`, `tailwind.config.js`, `eslint.config.mjs`) shape build and styling rules.

## Build, Test, and Development Commands
- `npm install` sets up the root; run it again after adding dependencies.
- `npm run dev` loads the full stack with the root `.env`, while `npm run dev:next` and `npm run dev:mastra` target the frontend or backend individually.
- `npm run build` followed by `npm run start` serves the production bundle; use `npm --prefix src/backend run build|start` when deploying Mastra separately.
- `npm run lint` enforces repository lint rules, and `npm run pretty` applies Prettier formatting before commits.

## Coding Style & Naming Conventions
- Prettier enforces 2-space indentation, single quotes, trailing commas, and a 100-character line width.
- ESLint must exit cleanly; follow React hooks rules and leverage TypeScript’s strict typing instead of `any`.
- Components use PascalCase filenames (e.g., `KonvaCanvas.tsx`), hooks start with `use`, and utility modules stay camelCase or kebab-case to mirror existing patterns.
- Compose Tailwind classes with `clsx` or `class-variance-authority` helpers where they already exist.

## Testing Guidelines
- No automated suite exists yet; colocate future `.test.ts` files beside the code under `src/` and cover both success and error scenarios.
- Stub external services (e.g., Mastra connectors) so tests remain deterministic.
- Run `npm run lint` and any added `test` script locally before requesting review.

## Commit & Pull Request Guidelines
- Mirror the short, imperative commit style in history (e.g., `snapping, basic walls`) and keep subjects under ~60 characters.
- Keep each commit focused; add body text when behavior changes or migrations are required.
- Pull requests should summarize the change, link issues or tickets, and attach screenshots or clips for UI-facing work.

## Security & Environment Tips
- Copy the shared `.env` template (request it from maintainers) and keep secrets out of Git; `dotenv -e .env -- ...` powers local runs.
- To reset local Mastra state during testing, delete `src/backend/storage.db*` and restart `npm run dev`.
