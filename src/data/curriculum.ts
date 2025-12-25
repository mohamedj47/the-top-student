import { GradeLevel, Subject } from '../types';

// --- START: 1. الهيكل الجديد المتكامل للدرس ---
export interface Lesson {
  title: string;
  youtubeId?: string; // خاصية اختيارية لرابط اليوتيوب
  visualDescription?: string; // خاصية اختيارية للوصف البصري
}
// --- END: 1. الهيكل الجديد المتكامل للدرس ---

export interface CurriculumSplit {
  term1: Lesson[];
  term2: Lesson[];
}

// Data Population - Updated based on Egyptian Ministry Curriculum (2025/2026)
const CURRICULUM_DATA: Record<string, Record<string, CurriculumSplit>> = {
  [GradeLevel.GRADE_10]: {
    [Subject.MATH]: {
      term1: [
        { title: "الجبر: حل معادلات الدرجة الثانية في متغير واحد", youtubeId: "YOUR_YOUTUBE_ID_HERE" },
        { 
          title: "الجبر: مقدمة عن الأعداد المركبة",
          youtubeId: "YOUR_YOUTUBE_ID_HERE", // <-- أضف رابط اليوتيوب هنا
          visualDescription: "تخيل أن خط الأعداد العادي الذي تعرفه (1, 2, 3, -1, -2...) هو مجرد 'شارع' أفقي مستقيم.\n\nالضرب في -1: عندما تضرب أي رقم في -1، تخيل أنك تقف عند الرقم، ثم تقوم بعمل دورة كاملة (180 درجة) على خط الأعداد لتهبط عند نظيره السالب.\n\nالضرب في i (العدد التخيلي): الآن، تخيل أن i هي 'خطوة سحرية'. إنها نصف دورة (90 درجة) فقط عكس اتجاه عقارب الساعة. إذا كنت تقف عند الرقم 3 على الشارع الأفقي، وضربته في i، فأنت تقفز 90 درجة إلى شارع جديد عمودي وتقف عند '3i'. إذا ضربت في i مرة أخرى، فأنت تقوم بنصف دورة أخرى (90 درجة أخرى) وتهبط عند -3 على الشارع الأفقي الأصلي.\n\nالخلاصة: العدد التخيلي i ليس 'تخيليًا' بل هو أمر بالدوران 90 درجة، يأخذنا من عالم الأعداد المسطح إلى بُعد جديد."
        },
        { title: "الجبر: تحديد نوع جذري المعادلة التربيعية", youtubeId: "YOUR_YOUTUBE_ID_HERE" },
        // ... أكمل بقية الدروس بنفس الطريقة
      ],
      term2: [
        { title: "الجبر: تنظيم البيانات في مصفوفات", youtubeId: "YOUR_YOUTUBE_ID_HERE" },
        // ...
      ]
    },
    // ... بقية المواد
  },
  // ... بقية الصفوف
};

// --- START: 2. الدالة التي أصلحتها ---
export const getCurriculumFor = (grade: GradeLevel, subject: Subject): CurriculumSplit => {
  const gradeData = CURRICULUM_DATA[grade];
  if (!gradeData || !gradeData[subject]) {
      console.warn(`Missing curriculum for ${grade} - ${subject}`);
      return { term1: [], term2: [] };
  }

  // هذه الدالة الداخلية تضمن أن كل الدروس (حتى القديمة) يتم تحويلها للهيكل الجديد
  const ensureLessonObjects = (lessons: (string | Lesson)[]): Lesson[] => {
    if (!lessons) return [];
    return lessons.map(lesson => {
      if (typeof lesson === 'string') {
        // هذا يحول الدروس القديمة (النصوص) إلى الهيكل الجديد
        return { title: lesson, youtubeId: 'DEFAULT_ID' }; // افترضنا ID افتراضي
      }
      return lesson; // الدروس الجديدة تبقى كما هي
    });
  }

  const subjectData = gradeData[subject];
  return {
    term1: ensureLessonObjects(subjectData.term1 as any),
    term2: ensureLessonObjects(subjectData.term2 as any)
  };
};
// --- END: 2. الدالة التي أصلحتها ---


// --- START: 3. تحديث الدالة الأخرى لتتوافق ---
export const getCurriculumStringForAI = (grade: GradeLevel, subject: Subject): string => {
    const data = getCurriculumFor(grade, subject);
    let output = "";
    
    if (data.term1.length > 0) {
        // نستخرج العناوين فقط من الكائنات
        output += "الترم الأول (First Term):\n- " + data.term1.map(lesson => lesson.title).join('\n- ') + "\n";
    }
    
    if (data.term2.length > 0) {
        // نستخرج العناوين فقط من الكائنات
        output += "\nالترم الثاني (Second Term):\n- " + data.term2.map(lesson => lesson.title).join('\n- ');
    } else {
        output += "\nالترم الثاني: لم تعلن الوزارة تفاصيله بعد.";
    }
    
    return output;
};
// --- END: 3. تحديث الدالة الأخرى لتتوافق ---
