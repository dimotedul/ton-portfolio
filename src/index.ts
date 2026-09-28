import { createCoinGeckoClient } from './api/coingecko';
import { createTonApiClient } from './api/tonapi';
import { createBot } from './bot/createBot';
import { getStrings } from './bot/locales';
import { loadConfig } from './config';
import { logError, logInfo } from './logger';
import { createPortfolioService } from './services/portfolioService';
import { createFileChatStore } from './storage/chatStore';

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const tonApi = createTonApiClient({ baseUrl: config.tonApiBaseUrl, apiKey: config.tonApiKey });
  const coinGecko = createCoinGeckoClient({ baseUrl: config.coinGeckoBaseUrl });
  const service = createPortfolioService({
    tonApi,
    coinGecko,
    cacheTtlMs: config.cacheTtlSeconds * 1000,
  });
  const store = createFileChatStore(config.storagePath);
  const bot = createBot(config.botToken, { service, store });

  await bot.api.setMyCommands(getStrings('en').commands);
  await bot.api.setMyCommands(getStrings('ru').commands, { language_code: 'ru' });

  process.once('SIGINT', () => {
    void bot.stop();
  });
  process.once('SIGTERM', () => {
    void bot.stop();
  });

  await bot.start({
    onStart: (botInfo) => {
      logInfo(`Bot started as @${botInfo.username}`);
    },
  });
}

main().catch((error: unknown) => {
  logError('Fatal error', error);
  process.exitCode = 1;
});
