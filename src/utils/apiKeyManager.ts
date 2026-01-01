
/**
 * نظام إدارة المفاتيح الذكي - إصدار الإنتاج الضخم (10,000+ طالب)
 */

interface KeyStatus {
  key: string;
  failedAt: number; // وقت آخر فشل للمفتاح
  isCoolingDown: boolean;
}

const KEYS_POOL: string[] = [
  process.env.API_KEY,
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  process.env.API_KEY_3,
  process.env.API_KEY_4,
  process.env.API_KEY_5
].filter(k => k && k.length > 10) as string[];

// حالة المفاتيح في الذاكرة
const keyRegistry: KeyStatus[] = KEYS_POOL.map(key => ({
  key,
  failedAt: 0,
  isCoolingDown: false
}));

const COOLDOWN_PERIOD = 60 * 1000; // فترة التبريد: دقيقة واحدة

export const getAvailableKeysCount = () => KEYS_POOL.length;

/**
 * اختيار أفضل مفتاح متاح حالياً ليس في فترة التبريد
 */
export const getApiKey = (): string => {
  const now = Date.now();
  
  // تنظيف حالة التبريد للمفاتيح التي انتهت مدتها
  keyRegistry.forEach(item => {
    if (item.isCoolingDown && (now - item.failedAt > COOLDOWN_PERIOD)) {
      item.isCoolingDown = false;
    }
  });

  // البحث عن أول مفتاح متاح (ليس في فترة تبريد)
  const healthyKey = keyRegistry.find(item => !item.isCoolingDown);
  
  if (healthyKey) return healthyKey.key;

  // إذا كانت كل المفاتيح في فترة تبريد (ضغط هائل)، نختار أقدم مفتاح فشل
  const oldestFailed = [...keyRegistry].sort((a, b) => a.failedAt - b.failedAt)[0];
  return oldestFailed.key;
};

/**
 * وسم مفتاح معين بالفشل لبدء فترة التبريد له
 */
export const markKeyAsFailed = (failedKey: string) => {
  const item = keyRegistry.find(i => i.key === failedKey);
  if (item) {
    item.failedAt = Date.now();
    item.isCoolingDown = true;
    console.warn(`⚠️ API Key moved to cooldown: ${failedKey.substring(0, 8)}...`);
  }
};

/**
 * التبديل اليدوي (للتوافق مع الكود القديم)
 */
export const rotateApiKey = (): boolean => {
  return KEYS_POOL.length > 1;
};

export const ensureApiKey = async (): Promise<boolean> => {
  const currentKey = getApiKey();
  return !!(currentKey && currentKey.length > 10);
};
