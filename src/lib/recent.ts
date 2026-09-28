export const MAX_RECENT_ADDRESSES = 5;

export function addRecentAddress(
  recentAddresses: readonly string[],
  address: string,
  limit = MAX_RECENT_ADDRESSES,
): string[] {
  return [address, ...recentAddresses.filter((existing) => existing !== address)].slice(0, limit);
}
