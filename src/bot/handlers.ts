import { Bot, Context, GrammyError, type InlineKeyboard } from 'grammy';
import { NetworkError, RateLimitError } from '../api/errors';
import { parseTonAddress } from '../lib/address';
import { addRecentAddress } from '../lib/recent';
import { logError } from '../logger';
import type { PortfolioService } from '../services/portfolioService';
import type { ChatStore } from '../storage/chatStore';
import { decodeCallback, encodeCallback } from './callbackData';
import { historyKeyboard, portfolioKeyboard, recentKeyboard, retryKeyboard } from './keyboards';
import { getStrings, resolveLocale, type Strings } from './locales';
import { renderHistory, renderPortfolio } from './render';

export interface BotDependencies {
  service: PortfolioService;
  store: ChatStore;
  now?: () => number;
}

interface View {
  text: string;
  keyboard: InlineKeyboard;
}

const MESSAGE_OPTIONS = {
  parse_mode: 'HTML' as const,
  link_preview_options: { is_disabled: true },
};

function stringsFor(ctx: Context): Strings {
  return getStrings(resolveLocale(ctx.from?.language_code));
}

function describeError(error: unknown, strings: Strings): string {
  if (error instanceof RateLimitError) {
    return strings.rateLimited;
  }
  if (error instanceof NetworkError) {
    return strings.networkError;
  }
  return strings.genericError;
}

function isMessageNotModified(error: unknown): boolean {
  return error instanceof GrammyError && error.description.includes('message is not modified');
}

async function publish(ctx: Context, view: View): Promise<void> {
  const options = { ...MESSAGE_OPTIONS, reply_markup: view.keyboard };
  if (ctx.callbackQuery !== undefined) {
    try {
      await ctx.editMessageText(view.text, options);
    } catch (error) {
      if (!isMessageNotModified(error)) {
        throw error;
      }
    }
    return;
  }
  await ctx.reply(view.text, options);
}

async function deliver(
  ctx: Context,
  strings: Strings,
  retryData: string,
  build: () => Promise<View>,
): Promise<void> {
  if (ctx.callbackQuery === undefined) {
    await ctx.replyWithChatAction('typing');
  }
  let view: View;
  try {
    view = await build();
  } catch (error) {
    logError('Failed to build view', error);
    view = { text: describeError(error, strings), keyboard: retryKeyboard(retryData, strings) };
  }
  await publish(ctx, view);
}

async function buildPortfolioView(
  dependencies: BotDependencies,
  chatId: number,
  friendlyAddress: string,
  strings: Strings,
  forceRefresh: boolean,
): Promise<View> {
  const snapshot = await dependencies.service.getPortfolio(friendlyAddress, { forceRefresh });
  const preferences = await dependencies.store.update(chatId, (current) => ({
    ...current,
    lastAddress: friendlyAddress,
    recentAddresses: addRecentAddress(current.recentAddresses, friendlyAddress),
  }));
  return {
    text: renderPortfolio(friendlyAddress, snapshot, preferences.showScam, strings),
    keyboard: portfolioKeyboard(
      friendlyAddress,
      {
        showScam: preferences.showScam,
        hasScam: snapshot.holdings.some((holding) => holding.isScam),
      },
      strings,
    ),
  };
}

async function buildToggledPortfolioView(
  dependencies: BotDependencies,
  chatId: number,
  friendlyAddress: string,
  strings: Strings,
): Promise<View> {
  await dependencies.store.update(chatId, (current) => ({
    ...current,
    showScam: !current.showScam,
  }));
  return buildPortfolioView(dependencies, chatId, friendlyAddress, strings, false);
}

async function buildHistoryView(
  dependencies: BotDependencies,
  friendlyAddress: string,
  strings: Strings,
  forceRefresh: boolean,
): Promise<View> {
  const snapshot = await dependencies.service.getHistory(friendlyAddress, { forceRefresh });
  const nowMs = (dependencies.now ?? Date.now)();
  return {
    text: renderHistory(friendlyAddress, snapshot, strings, nowMs),
    keyboard: historyKeyboard(friendlyAddress, strings),
  };
}

async function resolveTargetAddress(
  ctx: Context,
  dependencies: BotDependencies,
  strings: Strings,
  argument: string,
): Promise<string | null> {
  const candidate = argument.trim().split(/\s+/)[0] ?? '';
  if (candidate.length > 0) {
    const parsed = parseTonAddress(candidate);
    if (parsed === null) {
      await ctx.reply(strings.invalidAddress, MESSAGE_OPTIONS);
      return null;
    }
    return parsed.friendly;
  }
  const chatId = ctx.chatId;
  if (chatId === undefined) {
    return null;
  }
  const preferences = await dependencies.store.get(chatId);
  if (preferences.lastAddress === null) {
    await ctx.reply(strings.missingAddress, MESSAGE_OPTIONS);
    return null;
  }
  return preferences.lastAddress;
}

export function registerHandlers(bot: Bot, dependencies: BotDependencies): void {
  bot.command('start', async (ctx) => {
    await ctx.reply(stringsFor(ctx).start, MESSAGE_OPTIONS);
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(stringsFor(ctx).help, MESSAGE_OPTIONS);
  });

  bot.command('portfolio', async (ctx) => {
    const strings = stringsFor(ctx);
    const chatId = ctx.chatId;
    const address = await resolveTargetAddress(ctx, dependencies, strings, ctx.match);
    if (address === null || chatId === undefined) {
      return;
    }
    await deliver(ctx, strings, encodeCallback('refreshPortfolio', address), () =>
      buildPortfolioView(dependencies, chatId, address, strings, false),
    );
  });

  bot.command('history', async (ctx) => {
    const strings = stringsFor(ctx);
    const address = await resolveTargetAddress(ctx, dependencies, strings, ctx.match);
    if (address === null) {
      return;
    }
    await deliver(ctx, strings, encodeCallback('refreshHistory', address), () =>
      buildHistoryView(dependencies, address, strings, false),
    );
  });

  bot.command('recent', async (ctx) => {
    const strings = stringsFor(ctx);
    const chatId = ctx.chatId;
    if (chatId === undefined) {
      return;
    }
    const preferences = await dependencies.store.get(chatId);
    if (preferences.recentAddresses.length === 0) {
      await ctx.reply(strings.noRecent, MESSAGE_OPTIONS);
      return;
    }
    await ctx.reply(strings.recentTitle, {
      ...MESSAGE_OPTIONS,
      reply_markup: recentKeyboard(preferences.recentAddresses, strings),
    });
  });

  bot.on('callback_query:data', async (ctx) => {
    await ctx.answerCallbackQuery();
    const strings = stringsFor(ctx);
    const decoded = decodeCallback(ctx.callbackQuery.data);
    const chatId = ctx.chatId;
    if (decoded === null || chatId === undefined) {
      return;
    }
    const { action, address } = decoded;
    switch (action) {
      case 'portfolio':
        await deliver(ctx, strings, encodeCallback('refreshPortfolio', address), () =>
          buildPortfolioView(dependencies, chatId, address, strings, false),
        );
        break;
      case 'refreshPortfolio':
        await deliver(ctx, strings, encodeCallback('refreshPortfolio', address), () =>
          buildPortfolioView(dependencies, chatId, address, strings, true),
        );
        break;
      case 'history':
        await deliver(ctx, strings, encodeCallback('refreshHistory', address), () =>
          buildHistoryView(dependencies, address, strings, false),
        );
        break;
      case 'refreshHistory':
        await deliver(ctx, strings, encodeCallback('refreshHistory', address), () =>
          buildHistoryView(dependencies, address, strings, true),
        );
        break;
      case 'toggleScam':
        await deliver(ctx, strings, encodeCallback('portfolio', address), () =>
          buildToggledPortfolioView(dependencies, chatId, address, strings),
        );
        break;
    }
  });

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/') || ctx.chat.type !== 'private') {
      return;
    }
    const strings = stringsFor(ctx);
    const chatId = ctx.chatId;
    const parsed = parseTonAddress(text.split(/\s+/)[0] ?? '');
    if (parsed === null) {
      await ctx.reply(strings.invalidAddress, MESSAGE_OPTIONS);
      return;
    }
    await deliver(ctx, strings, encodeCallback('refreshPortfolio', parsed.friendly), () =>
      buildPortfolioView(dependencies, chatId, parsed.friendly, strings, false),
    );
  });
}
