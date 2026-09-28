import { Address } from '@ton/core';
import type { ParsedAddress } from '../types/domain';

export function parseTonAddress(input: string): ParsedAddress | null {
  const candidate = input.trim();
  if (candidate.length === 0) {
    return null;
  }
  try {
    const address = Address.parse(candidate);
    return {
      raw: address.toRawString(),
      friendly: address.toString({ urlSafe: true, bounceable: false }),
    };
  } catch {
    return null;
  }
}

export function toRawAddress(input: string): string {
  return parseTonAddress(input)?.raw ?? input.toLowerCase();
}

export function shortenAddress(address: string, edgeLength = 4): string {
  if (address.length <= edgeLength * 2 + 1) {
    return address;
  }
  return `${address.slice(0, edgeLength)}…${address.slice(-edgeLength)}`;
}
