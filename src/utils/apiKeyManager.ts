
/**
 * هذا الملف يدير مفاتيح الـ API ويدعم التبديل التلقائي لضمان عمل التطبيق 24/7
 */

interface KeyStatus {
  key: string;
  isBlocked: boolean;
  lastUsed: number;
  errorCount: number;
}

const keys: string[] = [
  process.env.API_KEY || '',
  process.env.API_KEY_2 || '',
  process.env.API_KEY_3 || '',
  process.env.API_KEY_4 || '',
  process.env.API_KEY_5 || ''
].filter(k => k.length > 10);

let keyStatuses: KeyStatus[] = keys.map(k => ({
  key: k,
  isBlocked: false,
  lastUsed: 0,
  errorCount: 0
}));

let currentKeyIndex = 0;

export const getAvailableKeysCount = (): number => keys.length;

export const getApiKey = (): string => {
  if (keys.length === 0) return process.env.API_KEY || '';
  
  // البحث عن أول مفتاح غير محظور
  const activeKey = keyStatuses.find(s => !s.isBlocked);
  if (activeKey) return activeKey.key;
  
  // إذا كانت كل المفاتيح محظورة، جرب إعادة تفعيل الأقدم
  const oldestKey = [...keyStatuses].sort((a, b) => a.lastUsed - b.lastUsed)[0];
  oldestKey.isBlocked = false;
  return oldestKey.key;
};

export const rotateApiKey = (): boolean => {
  if (keys.length <= 1) return false;
  
  // حظر المفتاح الحالي مؤقتاً
  const currentKey = getApiKey();
  const status = keyStatuses.find(s => s.key === currentKey);
  if (status) {
    status.isBlocked = true;
    status.lastUsed = Date.now();
    status.errorCount++;
    console.warn(`⚠️ تم حظر المفتاح رقم ${keys.indexOf(currentKey) + 1} بسبب كثرة الطلبات.`);
  }

  // إعادة فتح المفاتيح التي مر عليها أكثر من دقيقة
  keyStatuses.forEach(s => {
    if (s.isBlocked && Date.now() - s.lastUsed > 60000) {
      s.isBlocked = false;
      console.log(`✅ إعادة تفعيل المفتاح رقم ${keys.indexOf(s.key) + 1} بعد فترة الراحة.`);
    }
  });

  return true;
};

export const ensureApiKey = async (): Promise<boolean> => {
  return getApiKey().length > 10;
};

export const getActiveKeyIndex = (): number => {
  const currentKey = getApiKey();
  return keys.indexOf(currentKey) + 1;
};
