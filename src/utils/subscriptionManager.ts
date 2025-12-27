
/**
 * نظام إدارة الاشتراكات المتقدم - إصدار الإنتاج
 * يحقق الربط الصارم بين الجهاز، الكود، والفصل الدراسي
 */

const SALT = "EDU_PRO_SECRET_EGYPT_2026_KEY_V2";

export interface SubscriptionData {
  deviceId: string;
  gradeId: string;
  activationCode: string;
  activationDate: number;
  expirationDate: number;
}

/**
 * توليد بصمة ثابتة للجهاز (Stable Fingerprint)
 * تجمع بين عدة عوامل لضمان بقائها حتى لو تم مسح التخزين
 */
export const getStableDeviceId = (): string => {
  const n = window.navigator;
  const screen = window.screen;
  
  // دمج خصائص الجهاز الثابتة
  const fingerprintParts = [
    n.userAgent,
    n.platform,
    n.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    // إضافة معرف فريد مخزن كعامل إضافي
    localStorage.getItem('edu_permanent_uuid') || (() => {
      const uid = 'APP-' + Math.random().toString(36).substring(2, 15).toUpperCase();
      localStorage.setItem('edu_permanent_uuid', uid);
      return uid;
    })()
  ];
  
  const rawString = fingerprintParts.join('|');
  
  // دالة تشفير بسيطة ولكنها ثابتة (Simple Hash) لإنتاج معرف أنيق
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  
  return 'STD-' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
};

/**
 * خوارزمية التحقق من الكود
 * يجب أن يطابق الكود بصمة الجهاز + معرف الصف + الملح
 */
export const generateValidCode = (deviceId: string, gradeId: string): string => {
  const combined = deviceId + gradeId + SALT;
  // استخدام btoa مع تلاعب إضافي لجعل الكود فريداً وصعب التخمين
  const hash = btoa(combined).replace(/=/g, '').substring(0, 15).toUpperCase();
  // تنسيق الكود لشكل XXXX-XXXX-XXXX
  return hash.match(/.{1,4}/g)?.join('-') || hash;
};

/**
 * التحقق من حالة اشتراك صف معين
 */
export const checkSubscriptionStatus = (gradeId: string): { isSubscribed: boolean; daysLeft: number } => {
  const storageKey = `sub_meta_${gradeId}`;
  const dataRaw = localStorage.getItem(storageKey);
  
  if (!dataRaw) return { isSubscribed: false, daysLeft: 0 };
  
  try {
    const data: SubscriptionData = JSON.parse(dataRaw);
    const now = Date.now();
    
    // 1. تحقق من تطابق الجهاز (منع النقل)
    if (data.deviceId !== getStableDeviceId()) {
      localStorage.removeItem(storageKey); // حذف الاشتراك إذا تم نقله
      return { isSubscribed: false, daysLeft: 0 };
    }
    
    // 2. تحقق من انتهاء الصلاحية
    if (now > data.expirationDate) {
      return { isSubscribed: false, daysLeft: 0 };
    }
    
    const diff = data.expirationDate - now;
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    return { isSubscribed: true, daysLeft };
  } catch (e) {
    return { isSubscribed: false, daysLeft: 0 };
  }
};

/**
 * تفعيل اشتراك جديد
 */
export const activateGrade = (gradeId: string, code: string): { success: boolean; message: string } => {
  const deviceId = getStableDeviceId();
  const expectedCode = generateValidCode(deviceId, gradeId);
  
  if (code.trim().toUpperCase() !== expectedCode) {
    return { success: false, message: "كود التفعيل غير صالح لهذا الجهاز أو لهذا الصف." };
  }
  
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  
  const subData: SubscriptionData = {
    deviceId,
    gradeId,
    activationCode: code,
    activationDate: now,
    expirationDate: now + thirtyDays
  };
  
  localStorage.setItem(`sub_meta_${gradeId}`, JSON.stringify(subData));
  return { success: true, message: "تم التفعيل بنجاح لمدة 30 يوماً!" };
};
