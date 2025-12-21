
/**
 * هذا الملف يدير مفاتيح الـ API ويدعم التبديل التلقائي
 */

// دالة داخلية لجلب المفاتيح المتوفرة
function getAvailableKeys(): string[] {
  const keys = [
    process.env.API_KEY,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5
  ];
  return keys.filter(key => key && key.trim().length > 5) as string[];
}

let currentKeyIndex = 0;

/**
 * الحصول على مفتاح الـ API الحالي
 */
export const getApiKey = (): string => {
  const keys = getAvailableKeys();
  if (keys.length === 0) {
    return process.env.API_KEY || '';
  }
  if (currentKeyIndex >= keys.length) {
    currentKeyIndex = 0;
  }
  return keys[currentKeyIndex];
};

/**
 * تدوير المفتاح في حالة نفاذ الحصة
 */
export const rotateApiKey = (): boolean => {
  const keys = getAvailableKeys();
  if (keys.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  console.log(`تم تدوير المفتاح إلى الفهرس: ${currentKeyIndex}`);
  return true;
};

/**
 * التأكد من وجود مفتاح API صالح أو فتح نافذة الاختيار
 */
export const ensureApiKey = async (): Promise<boolean> => {
  const currentKey = getApiKey();
  
  if (currentKey && currentKey.length > 10) {
    return true;
  }

  // التحقق من وجود واجهة AI Studio (لبيئة التطوير)
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        return true; 
      }
      return true;
    } catch (err) {
      console.error("AI Studio Key Error", err);
      return false;
    }
  }
  
  return false;
};
