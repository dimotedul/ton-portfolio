import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFileChatStore } from '../storage/chatStore';

describe('createFileChatStore', () => {
  let directory = '';

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'ton-bot-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('returns defaults for unknown chats', async () => {
    const store = createFileChatStore(join(directory, 'chats.json'));
    await expect(store.get(1)).resolves.toEqual({
      recentAddresses: [],
      lastAddress: null,
      showScam: false,
    });
  });

  it('persists updates across store instances', async () => {
    const filePath = join(directory, 'nested', 'chats.json');
    await createFileChatStore(filePath).update(7, (current) => ({
      ...current,
      lastAddress: 'UQabc',
      showScam: true,
    }));
    await expect(createFileChatStore(filePath).get(7)).resolves.toMatchObject({
      lastAddress: 'UQabc',
      showScam: true,
    });
  });
});
