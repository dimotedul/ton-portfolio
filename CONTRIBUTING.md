# Contributing

Thanks for helping improve TON Portfolio Bot.

## Workflow

1. Fork the repository and create a branch from `main`.
2. Install dependencies with `npm install`.
3. Make your change and add or update tests in `src/test`.
4. Run `npm run lint`, `npm run typecheck` and `npm test`. All three must pass without warnings.
5. Open a pull request with a short description of what changed and why.

## Guidelines

- Keep the API layer in `src/api` free of Telegram code and the bot layer in `src/bot` free of raw API types.
- Map raw API responses to domain types only in `src/api/mappers.ts`.
- Keep calculations in `src/lib` as pure functions.
- Do not use `any`, `console.log`, or code comments. Prefer descriptive names.
- Tests must not touch the network.
