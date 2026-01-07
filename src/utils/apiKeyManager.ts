
interface KeyStatus {
  key: string;
  id: string;
  failedAt: number;
  isCoolingDown: boolean;
}

const KEYS_POOL: string[] = [
  process.env.API_KEY,  
  process.env.API_KEY_1,
  process.env.API_KEY_2, 
  process.env.API_KEY_3,
  process.env.API_KEY_4,
  process.env.API_KEY_5,
  process.env.API_KEY_6,
  process.env.API_KEY_7,
  process.env.API_KEY_8,
  process.env.API_KEY_9,
  process.env.API_KEY_10,
  process.env.API_KEY_11
].filter(k => typeof k === 'string' && k.length > 10) as string[];

const keyRegistry: KeyStatus[] = KEYS_POOL.map((key, index) => ({
  key,
  id: `key_${index}`,
  failedAt: 0,
  isCoolingDown: false
}));

const COOLDOWN_PERIOD = 90 * 1000;

export function getApiKey(excludeKey?: string): string {
  if (keyRegistry.length === 0) return process.env.API_KEY || '';
  
  const now = Date.now();
  keyRegistry.forEach(item => {
    if (item.isCoolingDown && (now - item.failedAt > COOLDOWN_PERIOD)) {
      item.isCoolingDown = false;
    }
  });

  let availableKeys = keyRegistry.filter(item => !item.isCoolingDown && item.key !== excludeKey);
  
  if (availableKeys.length === 0 && excludeKey) {
    availableKeys = keyRegistry.filter(item => item.key !== excludeKey);
  }

  if (availableKeys.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableKeys.length);
    return availableKeys[randomIndex].key;
  }

  return keyRegistry[0]?.key || process.env.API_KEY || '';
}

export function getAvailableKeys(): string[] {
  const now = Date.now();
  keyRegistry.forEach(item => {
    if (item.isCoolingDown && (now - item.failedAt > COOLDOWN_PERIOD)) {
      item.isCoolingDown = false;
    }
  });
  return keyRegistry.filter(item => !item.isCoolingDown).map(item => item.key);
}

export function markKeyAsFailed(failedKey: string): void {
  const item = keyRegistry.find(i => i.key === failedKey);
  if (item) {
    item.failedAt = Date.now();
    item.isCoolingDown = true;
    console.warn(`[Quota Shield] Key ${item.id} entered cooldown state.`);
  }
}

export async function ensureApiKey(): Promise<boolean> {
  return KEYS_POOL.length > 0;
}
