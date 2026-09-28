import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ChatPreferences } from '../types/domain';

export interface ChatStore {
  get(chatId: number): Promise<ChatPreferences>;
  update(
    chatId: number,
    change: (current: ChatPreferences) => ChatPreferences,
  ): Promise<ChatPreferences>;
}

export function createDefaultPreferences(): ChatPreferences {
  return { recentAddresses: [], lastAddress: null, showScam: false };
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export function createFileChatStore(filePath: string): ChatStore {
  let records: Map<string, ChatPreferences> | null = null;
  let writeQueue: Promise<void> = Promise.resolve();

  async function loadRecords(): Promise<Map<string, ChatPreferences>> {
    if (records !== null) {
      return records;
    }
    try {
      const content = await readFile(filePath, 'utf8');
      records = new Map(Object.entries(JSON.parse(content) as Record<string, ChatPreferences>));
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
      records = new Map();
    }
    return records;
  }

  function persist(current: Map<string, ChatPreferences>): Promise<void> {
    const snapshot = JSON.stringify(Object.fromEntries(current));
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(async () => {
        await mkdir(dirname(filePath), { recursive: true });
        const temporaryPath = `${filePath}.tmp`;
        await writeFile(temporaryPath, snapshot, 'utf8');
        await rename(temporaryPath, filePath);
      });
    return writeQueue;
  }

  return {
    async get(chatId) {
      const current = await loadRecords();
      return { ...createDefaultPreferences(), ...current.get(String(chatId)) };
    },

    async update(chatId, change) {
      const current = await loadRecords();
      const previous = { ...createDefaultPreferences(), ...current.get(String(chatId)) };
      const next = change(previous);
      current.set(String(chatId), next);
      await persist(current);
      return next;
    },
  };
}
