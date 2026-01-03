
import { GradeLevel, Subject } from '../types';

export interface CurriculumSplit {
  term1: string[];
  term2: string[];
}

export const CURRICULUM_DATA: Record<string, Record<string, CurriculumSplit>> = {
  // ==========================================
  // الصف الأول الثانوي (نظام 2025/2026 المطور)
  // ==========================================
  [GradeLevel.GRADE_10]: {
    [Subject.ARABIC]: {
      term1: ["نص: قيم وعادات (حاتم الطائي)", "نحو: كان وأخواتها", "بلاغة: التشبيه", "أدب: العصر الجاهلي", "نحو: كاد وأخواتها"],
      term2: ["نص: البيت وطن", "نحو: إعمال المشتقات", "بلاغة: الاستعارة", "أدب: صدر الإسلام والأموي"]
    },
    [Subject.GERMAN]: {
      term1: [
        "Lektion 1: Hallo! (التعارف والتحية)",
        "Grammatik: Verbkonjugation (sein, heißen, kommen)",
        "Lektion 2: Meine Familie (الأسرة والأرقام)",
        "Grammatik: Personalpronomen und Possessivartikel"
      ],
      term2: [
        "Lektion 3: Essen und Trinken (الأكل والشرب)",
        "Grammatik: Bestimmter und Unbestimmter Artikel",
        "Lektion 4: Meine Wohnung (المنزل والأثاث)",
        "Grammatik: Negation (kein / nicht)"
      ],
    },
    [Subject.FRENCH]: {
      term1: [
        "Unité 1: Le club de ma classe (تقديم النفس والزملاء)",
        "Grammaire: Les articles indéfinis / Verbe (être, s'appeler)",
        "Unité 2: Le club des artistes (الأدوات المدرسية والألوان)",
        "Grammaire: Avoir / Le pluriel des noms"
      ],
      term2: [
        "Unité 3: Le club des lecteurs (وصف المدرسة ومحتوياتها)",
        "Grammaire: Les articles définis / Aller / L'heure",
        "Unité 4: Le club des athlètes (وصف الأشخاص والعائلة)",
        "Grammaire: Les adjectifs possessifs / Verbes du 1er groupe"
      ],
    },
    [Subject.INTEGRATED_SCIENCES]: {
      term1: ["الوحدة الأولى: الاستدامة والبيئة", "الوحدة الثانية: الكيمياء الحيوية", "الوحدة الثالثة: التمثيل الغذائي"],
      term2: ["الوحدة الرابعة: الفيزياء الحيوية", "الوحدة الخامسة: الأرض والكون", "الوحدة السادسة: الطاقة المتجددة"]
    },
    [Subject.MATH]: {
      term1: ["الجبر: الأعداد المركبة", "الجبر: نوع جذري المعادلة", "المثلثات: القياس الدائري", "الهندسة: التشابه"],
      term2: ["الجبر: المتباينات", "المثلثات: الحل العام", "الهندسة: التناسب في الدائرة", "الهندسة: المتجهات"]
    },
    [Subject.PHILOSOPHY]: {
      term1: ["مبادئ التفكير الفلسفي", "نشأة الفلسفة"],
      term2: ["مبادئ التفكير العلمي", "التفكير الناقد والإبداعي"]
    },
    [Subject.HISTORY]: {
      term1: ["التاريخ كعلم", "حضارة مصر الفرعونية"],
      term2: ["حضارة بلاد العراق", "حضارة فينيقيا"]
    }
  },

  // ==========================================
  // الصف الثاني الثانوي (نظام 2025/2026 المختصر)
  // ==========================================
  [GradeLevel.GRADE_11]: {
    [Subject.GERMAN]: {
      term1: [
        "Lektion 5: Mein Tag (الروتين اليومي والوقت)",
        "Grammatik: Trennbare Verben / Modalverben (können, müssen)",
        "Lektion 6: Freizeit (وقت الفراغ والهوايات)",
        "Grammatik: Akkusativ / Satzbau"
      ],
      term2: [
        "Lektion 7: Gesundheit (الصحة وأعضاء الجسم)",
        "Grammatik: Imperativ / Modalverb (sollen)",
        "Lektion 8: In der Stadt (في المدينة والمواصلات)",
        "Grammatik: Präpositionen mit Dativ"
      ],
    },
    [Subject.FRENCH]: {
      term1: [
        "Unité 1: Le club des citadins (وصف الحي والمدينة)",
        "Grammaire: Les prépositions de lieu / L'impératif",
        "Unité 2: Le club des photographes (وصف الطقس وفصول السنة)",
        "Grammaire: Le futur proche / Venir de"
      ],
      term2: [
        "Unité 3: Le club des lookés (الملابس والإكسسوارات)",
        "Grammaire: Les adjectifs démonstratifs / Le pronom (en)",
        "Unité 4: Le club des décorateurs (وصف المنزل والغرف)",
        "Grammaire: Les tâches ménagères / Passé composé"
      ],
    },
    [Subject.PHYSICS]: {
      term1: ["الحركة الاهتزازية والموجية", "خواص الضوء", "المنشور الثلاثي"],
      term2: ["خواص الموائع الساكنة", "قوانين الغازات"]
    },
    [Subject.CHEMISTRY]: {
      term1: ["بنية الذرة", "الجدول الدوري الحديث"],
      term2: ["الروابط الكيميائية", "عناصر المجموعات المنتظمة"]
    },
    [Subject.BIOLOGY]: {
      term1: ["التغذية والتمثيل الغذائي", "النقل في النبات والحيوان"],
      term2: ["التنفس الخلوي", "الإخراج والإحساس"]
    }
  },

  // ==========================================
  // الصف الثالث الثانوي (شهادة 2026 - 5 مواد + اللغات)
  // ==========================================
  [GradeLevel.GRADE_12]: {
    [Subject.GERMAN]: {
      term1: [
        "Lektion 9: Berufe (المهن والوظائف)",
        "Lektion 10: Reisen (السفر والعطلات)",
        "Grammatik: Perfekt / Präteritum (war, hatte)"
      ],
      term2: [
        "Lektion 11: Kleidung (الملابس والتسوق)",
        "Lektion 12: Feste (الأعياد والمناسبات)",
        "Grammatik: Adjektivdeklination / Konjunktionen"
      ],
    },
    [Subject.FRENCH]: {
      term1: [
        "Unité 1: Le club des sportifs (الرياضات بأنواعها)",
        "Unité 2: Le club des gourmands (الأكل والمشتريات)",
        "Grammaire: Les pronoms personnels (COD / COI)"
      ],
      term2: [
        "Unité 3: Le club des explorateurs (الريف والحيوانات)",
        "Unité 4: Le club des voyageurs (المواصلات والأماكن)",
        "Grammaire: Le subjonctif / La négation complexe"
      ],
    },
    [Subject.PHYSICS]: {
      term1: ["التيار الكهربي وقانون أوم", "التأثير المغناطيسي", "الحث الكهرومغناطيسي"],
      term2: ["دوائر التيار المتردد", "الفيزياء الحديثة"]
    },
    [Subject.CHEMISTRY]: {
      term1: ["العناصر الانتقالية", "التحليل الكيميائي", "الاتزان الكيميائي"],
      term2: ["الكيمياء الكهربية", "الكيمياء العضوية"]
    }
  }
};

export const getCurriculumFor = (grade: GradeLevel, subject: Subject): CurriculumSplit => {
  return CURRICULUM_DATA[grade]?.[subject] || { term1: [], term2: [] };
};

export const getCurriculumStringForAI = (grade: GradeLevel, subject: Subject): string => {
    const data = getCurriculumFor(grade, subject);
    let output = "";
    if (data.term1.length > 0) output += "الترم الأول:\n- " + data.term1.join('\n- ') + "\n";
    if (data.term2.length > 0) output += "\nالترم الثاني:\n- " + data.term2.join('\n- ');
    return output;
};
