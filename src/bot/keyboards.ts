import { InlineKeyboard } from 'grammy';
import { shortenAddress } from '../lib/address';
import { tonviewerAddressUrl } from '../lib/links';
import { encodeCallback } from './callbackData';
import type { Strings } from './locales';

export interface PortfolioKeyboardOptions {
  showScam: boolean;
  hasScam: boolean;
}

export function portfolioKeyboard(
  friendlyAddress: string,
  options: PortfolioKeyboardOptions,
  strings: Strings,
): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text(strings.buttons.refresh, encodeCallback('refreshPortfolio', friendlyAddress))
    .text(strings.buttons.history, encodeCallback('history', friendlyAddress))
    .row();
  if (options.hasScam) {
    keyboard
      .text(
        options.showScam ? strings.buttons.hideScam : strings.buttons.showScam,
        encodeCallback('toggleScam', friendlyAddress),
      )
      .row();
  }
  return keyboard.url(strings.buttons.tonviewer, tonviewerAddressUrl(friendlyAddress));
}

export function historyKeyboard(friendlyAddress: string, strings: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(strings.buttons.refresh, encodeCallback('refreshHistory', friendlyAddress))
    .text(strings.buttons.portfolio, encodeCallback('portfolio', friendlyAddress))
    .row()
    .url(strings.buttons.tonviewer, tonviewerAddressUrl(friendlyAddress));
}

export function recentKeyboard(
  friendlyAddresses: readonly string[],
  strings: Strings,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const address of friendlyAddresses) {
    keyboard.text(`${strings.buttons.portfolio} ${shortenAddress(address)}`, encodeCallback('portfolio', address)).row();
  }
  return keyboard;
}

export function retryKeyboard(retryData: string, strings: Strings): InlineKeyboard {
  return new InlineKeyboard().text(strings.buttons.retry, retryData);
}
