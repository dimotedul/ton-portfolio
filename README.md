# TON Portfolio Bot

A read-only Telegram bot that shows the portfolio of any TON wallet. Send an address and the bot replies with the TON balance, Jetton balances, the total value in USD and recent transactions with USD values. The bot never asks for private keys and never connects to a wallet.

## Features

- Accepts raw (`0:...`) and user-friendly (`EQ...` / `UQ...`) addresses, validated with `@ton/core`
- Portfolio summary: total USD value, TON amount, 24h TON price change
- Assets list: TON and every Jetton with symbol, correctly scaled amount, price and USD value, sorted by USD value
- Jettons blacklisted by TonAPI are hidden by default and can be revealed with a button
- Transaction history: received, sent, swap or other, counterparty, amount, USD value at current price, relative time and a tonviewer.com link
- Inline buttons for refresh, history, portfolio, scam visibility and retry after errors
- Last 5 addresses per chat, available through `/recent`
- Data cached for 60 seconds, manual refresh bypasses the cache
- Optional TonAPI key; without it the bot works and handles HTTP 429 with a clear message and automatic retries with exponential backoff
- Russian and English interface chosen from the Telegram language

## Tech stack

- Node.js 22, TypeScript (strict mode)
- grammY for the Telegram Bot API
- `@ton/core` for address parsing
- TonAPI and CoinGecko as data sources
- Vitest for tests, ESLint (typescript-eslint) and Prettier
- Docker and GitHub Actions

## Getting started

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create the environment file and set `BOT_TOKEN`:

   ```bash
   cp .env.example .env
   ```

4. Run in development mode:

   ```bash
   npm run dev
   ```

5. Or build and run the production bundle:

   ```bash
   npm run build
   npm start
   ```

Open your bot in Telegram, send `/start` and then any TON address.

## Bot commands

| Command               | Description                           |
| --------------------- | ------------------------------------- |
| `/portfolio <address>` | Balances and total value              |
| `/history <address>`   | Recent transactions                   |
| `/recent`              | Last 5 addresses used in this chat    |
| `/help`                | Help                                  |

Sending an address as a plain message is the same as `/portfolio`. Commands without an argument use the last address of the chat.

## Environment variables

| Variable             | Required | Default                     | Description                                   |
| -------------------- | -------- | --------------------------- | --------------------------------------------- |
| `BOT_TOKEN`          | yes      |                             | Telegram bot token                            |
| `TONAPI_KEY`         | no       |                             | TonAPI key that raises rate limits            |
| `TONAPI_BASE_URL`    | no       | `https://tonapi.io`         | TonAPI base URL                               |
| `COINGECKO_BASE_URL` | no       | `https://api.coingecko.com` | CoinGecko base URL                            |
| `CACHE_TTL_SECONDS`  | no       | `60`                        | How long portfolio and history are cached     |
| `STORAGE_PATH`       | no       | `./data/chats.json`         | JSON file with per-chat recent addresses      |

## Scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Run with file watching                       |
| `npm run build`     | Compile to `dist`                            |
| `npm start`         | Run the compiled bot                         |
| `npm run lint`      | ESLint with zero warnings allowed            |
| `npm run format`    | Format the repository with Prettier          |
| `npm test`          | Run unit tests                               |
| `npm run typecheck` | Type check without emitting files            |

## Docker

```bash
docker build -t ton-portfolio-bot .
docker run -d --env-file .env -v ton-portfolio-data:/app/data ton-portfolio-bot
```

The deploy workflow builds the image and pushes it to GitHub Container Registry when a tag matching `v*` is pushed.

## Project structure

```
src/
  api/        TonAPI and CoinGecko clients, request helper, error classes, response mappers
  bot/        grammY handlers, keyboards, callback data, message rendering, locales
  lib/        pure helpers: addresses, formatting, portfolio and transaction calculations
  services/   portfolio service and TTL cache
  storage/    JSON file store for per-chat state
  types/      raw API types and domain types
  test/       fixtures and unit tests
```

## How it works

1. The address is parsed with `@ton/core` and normalized to the non-bounceable user-friendly form.
2. The portfolio service requests the TON balance, Jetton balances and the TON price in parallel, then requests Jetton prices from the TonAPI rates endpoint.
3. Raw responses are mapped to domain types in `src/api/mappers.ts`. Jettons with the `blacklist` verification are flagged as scam and excluded from the total.
4. Pure functions build holdings, sort them by USD value and compute the total. Amounts are scaled with `bigint` arithmetic, so no precision is lost.
5. Transactions are derived from TonAPI events and priced with current prices.
6. Messages are rendered as Telegram HTML. Buttons carry the action and the address in callback data, so they keep working on old messages.
7. On HTTP 429 the request helper waits with exponential backoff, honors `Retry-After`, and finally reports a clear rate limit message with a retry button.

## License

MIT
