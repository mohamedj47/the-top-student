
/**
 * هذا الملف يدير مفاتيح الـ API ويدعم التبديل التلقائي
 */

function getAvailableKeys(): string[] {
  const keys = [
    process.env.API_KEY,
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5
  ];
  
  const validKeys = keys.filter(key => key && key.trim().length > 5) as string[];
  
  return validKeys;
}

let currentKeyIndex = 0;

export const getAvailableKeysCount = (): number => {
  return getAvailableKeys().length;
};

export const getApiKey = (): string => {
  const keys = getAvailableKeys();
  if (keys.length === 0) return process.env.API_KEY || '';
  if (currentKeyIndex >= keys.length) currentKeyIndex = 0;
  return keys[currentKeyIndex];
};

export const rotateApiKey = (): boolean => {
  const keys = getAvailableKeys();
  if (keys.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return true;
};

export const ensureApiKey = async (): Promise<boolean> => {
  const currentKey = getApiKey();
  if (currentKey && currentKey.length > 10) return true;
  return false;
};
