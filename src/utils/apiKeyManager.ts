
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

const COOLDOWN_PERIOD = 60 * 1000; // 60 seconds cooldown for failed keys

export function getApiKey(): string {
  if (keyRegistry.length === 0) return process.env.API_KEY || '';
  
  const now = Date.now();
  keyRegistry.forEach(item => {
    if (item.isCoolingDown && (now - item.failedAt > COOLDOWN_PERIOD)) {
      item.isCoolingDown = false;
    }
  });

  const available = keyRegistry.filter(item => !item.isCoolingDown);
  
  // توزيع الحمل بناءً على البصمة الزمنية لضمان عدم الضغط على مفتاح واحد
  if (available.length === 0) return keyRegistry[0].key;
  
  const deviceId = localStorage.getItem('device_id') || 'guest';
  const hash = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return available[hash % available.length].key;
}

export function markKeyAsFailed(failedKey: string): void {
  const item = keyRegistry.find(i => i.key === failedKey);
  if (item) {
    item.failedAt = Date.now();
    item.isCoolingDown = true;
    console.warn(`[Shield] Key ${item.id} moved to cooldown.`);
  }
}

export async function ensureApiKey(): Promise<boolean> {
  return KEYS_POOL.length > 0;
}
