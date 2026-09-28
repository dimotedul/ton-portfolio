import { parseTonAddress } from '../lib/address';

export type CallbackAction =
  | 'portfolio'
  | 'refreshPortfolio'
  | 'history'
  | 'refreshHistory'
  | 'toggleScam';

export interface DecodedCallback {
  action: CallbackAction;
  address: string;
}

const PREFIX_BY_ACTION: Readonly<Record<CallbackAction, string>> = {
  portfolio: 'pf',
  refreshPortfolio: 'pr',
  history: 'hs',
  refreshHistory: 'hr',
  toggleScam: 'sc',
};

export function encodeCallback(action: CallbackAction, friendlyAddress: string): string {
  return `${PREFIX_BY_ACTION[action]}:${friendlyAddress}`;
}

export function decodeCallback(data: string): DecodedCallback | null {
  const separatorIndex = data.indexOf(':');
  if (separatorIndex < 0) {
    return null;
  }
  const prefix = data.slice(0, separatorIndex);
  const action = (Object.keys(PREFIX_BY_ACTION) as CallbackAction[]).find(
    (candidate) => PREFIX_BY_ACTION[candidate] === prefix,
  );
  if (action === undefined) {
    return null;
  }
  const parsed = parseTonAddress(data.slice(separatorIndex + 1));
  return parsed === null ? null : { action, address: parsed.friendly };
}
