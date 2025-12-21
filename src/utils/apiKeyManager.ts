
// هذا الملف يدير مفاتيح الـ API ويدعم التبديل التلقائي والتحقق من الصلاحية

function getAvailableKeys(): string[] {
  const keys = [
    process.env.API_KEY,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5
  ];
  return keys.filter(key => key && key.trim().length > 0) as string[];
}

let currentKeyIndex = 0;

/**
 * الحصول على مفتاح الـ API الحالي
 */
export function getApiKey(): string {
  const keys = getAvailableKeys();
  if (keys.length === 0) {
    return process.env.API_KEY || '';
  }
  if (currentKeyIndex >= keys.length) {
    currentKeyIndex = 0;
  }
  return keys[currentKeyIndex];
}

/**
 * تدوير المفتاح في حالة نفاذ الحصة
 */
export function rotateApiKey(): boolean {
  const keys = getAvailableKeys();
  if (keys.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  console.log(`تم تدوير المفتاح إلى الفهرس: ${currentKeyIndex}`);
  return true;
}

/**
 * حل جذري: دالة تضمن للمتصفح وجود مفتاح قبل بدء العملية
 * تقوم بفحص البيئة وفتح نافذة الاختيار إذا لزم الأمر
 */
export async function ensureApiKey(): Promise<boolean> {
  const currentKey = getApiKey();
  
  // إذا كان المفتاح موجوداً وطويلاً كفاية، نعتبره صالحاً مبدئياً
  if (currentKey && currentKey.length > 5) {
    return true;
  }

  // التحقق من وجود واجهة AI Studio في المتصفح
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        console.warn("API Key is missing, opening selection dialog...");
        await (window as any).aistudio.openSelectKey();
        return true; 
      }
      return true;
    } catch (err) {
      console.error("Error checking/opening AI Studio Key Dialog", err);
      return false;
    }
  }
  
  return false;
}
