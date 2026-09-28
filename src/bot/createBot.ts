import { Bot } from 'grammy';
import { logError } from '../logger';
import { registerHandlers, type BotDependencies } from './handlers';

export function createBot(token: string, dependencies: BotDependencies): Bot {
  const bot = new Bot(token);
  registerHandlers(bot, dependencies);
  bot.catch(({ error }) => {
    logError('Unhandled bot error', error);
  });
  return bot;
}
