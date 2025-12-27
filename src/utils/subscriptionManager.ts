
/**
 * نظام إدارة الاشتراكات المتقدم - إصدار الإنتاج (V2)
 * يحقق الربط الصارم بين الجهاز، الكود، والفصل الدراسي
 */

const SALT = "TOP_STUDENT_PRO_2026_SECRET_SYSTEM";

export interface SubscriptionData {
  deviceId: string;
  gradeId: string;
  activationCode: string;
  activationDate: number;
  expirationDate: number;
}

/**
 * توليد بصمة ثابتة للجهاز (Stable Fingerprint)
 * تعتمد على خصائص المتصفح والنظام لضمان عدم التغير
 */
export const getStableDeviceId = (): string => {
  const n = window.navigator;
  const screen = window.screen;
  
  const fingerprintParts = [
    n.userAgent,
    n.platform,
    n.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    // معرف فريد مخزن لتعزيز الثبات
    localStorage.getItem('edu_permanent_uuid') || (() => {
      const uid = 'TOP-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('edu_permanent_uuid', uid);
      return uid;
    })()
  ];
  
  const rawString = fingerprintParts.join('|');
  
  // دالة تشفير لإنتاج معرف أنيق يبدأ بـ STD-
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  
  return 'STD-' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
};

/**
 * خوارزمية توليد كود التفعيل (Deterministic)
 * الكود ناتج عن دمج (معرف الجهاز + معرف الصف + الملح السري)
 * تم الإصلاح: يدعم الآن الأحرف العربية في المدخلات عبر تشفيرها قبل استخدام btoa
 */
export const generateValidCode = (deviceId: string, gradeId: string): string => {
  if (!deviceId || !gradeId) return "";
  
  const cleanId = deviceId.trim().toUpperCase();
  const combined = `${cleanId}:${gradeId}:${SALT}`;
  
  // FIX: btoa expects Latin1. gradeId contains Arabic (UTF-8).
  // We must encode to UTF-8 binary string before calling btoa.
  let hash = "";
  try {
    const utf8Combined = unescape(encodeURIComponent(combined));
    hash = btoa(utf8Combined).replace(/[^A-Z0-9]/g, '');
  } catch (e) {
    // Fallback if encoding fails
    hash = cleanId.substring(0, 12);
  }
  
  const s1 = hash.substring(0, 4) || "X7R1";
  const s2 = hash.substring(4, 8) || "M9Q2";
  const s3 = hash.substring(8, 12) || "P4L5";
  
  return `${s1}-${s2}-${s3}`.toUpperCase();
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
    
    // 1. تحقق من تطابق الجهاز (منع النقل أو النسخ)
    if (data.deviceId !== getStableDeviceId()) {
      return { isSubscribed: false, daysLeft: 0 };
    }
    
    // 2. تحقق من صلاحية الكود لهذا الصف
    const expectedCode = generateValidCode(data.deviceId, gradeId);
    if (data.activationCode !== expectedCode) {
      return { isSubscribed: false, daysLeft: 0 };
    }
    
    // 3. تحقق من انتهاء الصلاحية (30 يوم)
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
  
  const cleanCode = code.trim().toUpperCase();
  
  if (cleanCode !== expectedCode) {
    return { success: false, message: "عذراً! هذا الكود غير صالح لهذا الجهاز أو لهذا الصف الدراسي." };
  }
  
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  
  const subData: SubscriptionData = {
    deviceId,
    gradeId,
    activationCode: cleanCode,
    activationDate: now,
    expirationDate: now + thirtyDays
  };
  
  localStorage.setItem(`sub_meta_${gradeId}`, JSON.stringify(subData));
  return { success: true, message: "تم التفعيل بنجاح! متاح لك الوصول الكامل لمدة 30 يوماً." };
};
