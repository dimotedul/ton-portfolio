const TONVIEWER_BASE_URL = 'https://tonviewer.com';

export function tonviewerAddressUrl(address: string): string {
  return `${TONVIEWER_BASE_URL}/${address}`;
}

export function tonviewerTransactionUrl(eventId: string): string {
  return `${TONVIEWER_BASE_URL}/transaction/${eventId}`;
}
