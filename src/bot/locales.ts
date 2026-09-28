import type { Locale, TransactionKind } from '../types/domain';

export interface CommandDescription {
  command: string;
  description: string;
}

export interface Strings {
  intlLocale: string;
  start: string;
  help: string;
  invalidAddress: string;
  missingAddress: string;
  noRecent: string;
  recentTitle: string;
  portfolioTitle: string;
  historyTitle: string;
  historyEmpty: string;
  emptyWallet: string;
  total: string;
  tonChange24h: string;
  updated: string;
  view: string;
  from: string;
  to: string;
  kinds: Record<TransactionKind, string>;
  hiddenScam: (count: number) => string;
  moreHoldings: (count: number) => string;
  rateLimited: string;
  networkError: string;
  genericError: string;
  buttons: {
    refresh: string;
    history: string;
    portfolio: string;
    showScam: string;
    hideScam: string;
    tonviewer: string;
    retry: string;
  };
  commands: CommandDescription[];
}

const en: Strings = {
  intlLocale: 'en',
  start: [
    '👋 <b>TON Portfolio Tracker</b>',
    '',
    'Send me a TON wallet address (<code>UQ…</code>, <code>EQ…</code> or <code>0:…</code>) and I will show its TON balance, Jettons, total value in USD and recent transactions.',
    '',
    'The bot is read-only: it never asks for private keys and never connects to a wallet.',
    '',
    'Use /help to see all commands.',
  ].join('\n'),
  help: [
    '<b>Commands</b>',
    '/portfolio &lt;address&gt; — balances and total value',
    '/history &lt;address&gt; — recent transactions',
    '/recent — your last 5 addresses',
    '/help — this message',
    '',
    'You can also send an address as a plain message. Commands without an argument use the last address you looked up.',
  ].join('\n'),
  invalidAddress:
    '❌ This is not a valid TON address. Send an address like <code>UQ…</code>, <code>EQ…</code> or <code>0:…</code>.',
  missingAddress: 'Send a TON address first, for example: /portfolio UQ…',
  noRecent: 'No recent addresses yet. Send a TON address to get started.',
  recentTitle: '🕘 <b>Recent addresses</b>',
  portfolioTitle: '💼 Portfolio',
  historyTitle: '🧾 Transactions',
  historyEmpty: 'No transactions found for this address.',
  emptyWallet: 'This wallet is empty.',
  total: 'Total',
  tonChange24h: 'TON 24h',
  updated: 'Updated',
  view: 'view',
  from: 'from',
  to: 'to',
  kinds: { received: 'Received', sent: 'Sent', swap: 'Swap', other: 'Other' },
  hiddenScam: (count) => `🙈 ${count} scam token(s) hidden`,
  moreHoldings: (count) => `…and ${count} more`,
  rateLimited:
    '⏳ The data provider is limiting requests. Please try again in a minute. The bot owner can raise the limit with a TonAPI key.',
  networkError: '📡 Could not reach the data provider. Please try again.',
  genericError: '⚠️ Something went wrong while loading data. Please try again.',
  buttons: {
    refresh: '🔄 Refresh',
    history: '🧾 History',
    portfolio: '💼 Portfolio',
    showScam: '👁 Show scam tokens',
    hideScam: '🙈 Hide scam tokens',
    tonviewer: '🔎 Open in Tonviewer',
    retry: '🔁 Retry',
  },
  commands: [
    { command: 'portfolio', description: 'Portfolio of a TON address' },
    { command: 'history', description: 'Recent transactions' },
    { command: 'recent', description: 'Recent addresses' },
    { command: 'help', description: 'Help' },
  ],
};

const ru: Strings = {
  intlLocale: 'ru',
  start: [
    '👋 <b>TON Portfolio Tracker</b>',
    '',
    'Отправьте адрес TON-кошелька (<code>UQ…</code>, <code>EQ…</code> или <code>0:…</code>), и я покажу баланс TON, Jetton-токены, общую стоимость в USD и последние транзакции.',
    '',
    'Бот работает только на чтение: он не запрашивает приватные ключи и не подключается к кошельку.',
    '',
    'Список команд: /help',
  ].join('\n'),
  help: [
    '<b>Команды</b>',
    '/portfolio &lt;адрес&gt; — балансы и общая стоимость',
    '/history &lt;адрес&gt; — последние транзакции',
    '/recent — последние 5 адресов',
    '/help — эта справка',
    '',
    'Адрес также можно просто отправить сообщением. Команды без аргумента используют последний просмотренный адрес.',
  ].join('\n'),
  invalidAddress:
    '❌ Это не похоже на TON-адрес. Отправьте адрес вида <code>UQ…</code>, <code>EQ…</code> или <code>0:…</code>.',
  missingAddress: 'Сначала отправьте TON-адрес, например: /portfolio UQ…',
  noRecent: 'Недавних адресов пока нет. Отправьте TON-адрес, чтобы начать.',
  recentTitle: '🕘 <b>Недавние адреса</b>',
  portfolioTitle: '💼 Портфель',
  historyTitle: '🧾 Транзакции',
  historyEmpty: 'Для этого адреса транзакций не найдено.',
  emptyWallet: 'Этот кошелёк пуст.',
  total: 'Всего',
  tonChange24h: 'TON за 24ч',
  updated: 'Обновлено',
  view: 'открыть',
  from: 'от',
  to: 'кому',
  kinds: { received: 'Получено', sent: 'Отправлено', swap: 'Обмен', other: 'Другое' },
  hiddenScam: (count) => `🙈 Скрыто скам-токенов: ${count}`,
  moreHoldings: (count) => `…и ещё ${count}`,
  rateLimited:
    '⏳ Провайдер данных ограничивает запросы. Попробуйте через минуту. Владелец бота может повысить лимит с помощью ключа TonAPI.',
  networkError: '📡 Не удалось связаться с провайдером данных. Попробуйте ещё раз.',
  genericError: '⚠️ Не удалось загрузить данные. Попробуйте ещё раз.',
  buttons: {
    refresh: '🔄 Обновить',
    history: '🧾 История',
    portfolio: '💼 Портфель',
    showScam: '👁 Показать скам-токены',
    hideScam: '🙈 Скрыть скам-токены',
    tonviewer: '🔎 Открыть в Tonviewer',
    retry: '🔁 Повторить',
  },
  commands: [
    { command: 'portfolio', description: 'Портфель по TON-адресу' },
    { command: 'history', description: 'Последние транзакции' },
    { command: 'recent', description: 'Недавние адреса' },
    { command: 'help', description: 'Справка' },
  ],
};

export function resolveLocale(languageCode: string | undefined): Locale {
  return languageCode?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function getStrings(locale: Locale): Strings {
  return locale === 'ru' ? ru : en;
}
