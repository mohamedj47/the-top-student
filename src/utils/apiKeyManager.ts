
/**
 * نظام إدارة المفاتيح الذكي - إصدار الإنتاج الضخم (10,000+ طالب)
 * يعتمد على خوارزمية التوزيع بناءً على معرف الجهاز (Deterministic Sharding)
 */

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
].filter(k => k && k.length > 10) as string[];

// حالة المفاتيح في الذاكرة
const keyRegistry: KeyStatus[] = KEYS_POOL.map((key, index) => ({
  key,
  id: `key_${index}`,
  failedAt: 0,
  isCoolingDown: false
}));

const COOLDOWN_PERIOD = 60 * 1000; // فترة التبريد الأساسية: 60 ثانية

/**
 * دالة بسيطة لعمل Hash لمعرف الجهاز لتحويله إلى رقم
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * اختيار أفضل مفتاح متاح حالياً مع توزيع الطلاب
 */
export const getApiKey = (): string => {
  const deviceId = typeof window !== 'undefined' ? localStorage.getItem('device_id') || 'guest' : 'server';
  const now = Date.now();
  
  // 1. تنظيف المفاتيح من فترة التبريد
  keyRegistry.forEach(item => {
    if (item.isCoolingDown && (now - item.failedAt > COOLDOWN_PERIOD)) {
      item.isCoolingDown = false;
    }
  });

  // 2. تحديد نقطة البداية للطالب الحالي (Load Balancing)
  // الطالب دائماً سيبدأ محاولته من نفس المفتاح المخصص له لتوزيع الضغط
  const startIndex = hashString(deviceId) % keyRegistry.length;

  // 3. البحث عن مفتاح سليم بدءاً من حصة الطالب
  for (let i = 0; i < keyRegistry.length; i++) {
    const currentIndex = (startIndex + i) % keyRegistry.length;
    const candidate = keyRegistry[currentIndex];
    if (!candidate.isCoolingDown) return candidate.key;
  }

  // 4. إذا كانت كل الآبار جافة، نأخذ الأقدم فشلاً
  const oldestFailed = [...keyRegistry].sort((a, b) => a.failedAt - b.failedAt)[0];
  return oldestFailed.key;
};

export const markKeyAsFailed = (failedKey: string) => {
  const item = keyRegistry.find(i => i.key === failedKey);
  if (item) {
    item.failedAt = Date.now();
    item.isCoolingDown = true;
    console.warn(`❌ [API Monitor] Key ${item.id} reached quota limit. Cooling down...`);
  }
};

export const getAvailableKeysCount = () => keyRegistry.length;
export const getHealthyKeysCount = () => keyRegistry.filter(k => !k.isCoolingDown).length;

export const ensureApiKey = async (): Promise<boolean> => {
  const currentKey = getApiKey();
  return !!(currentKey && currentKey.length > 10);
};
