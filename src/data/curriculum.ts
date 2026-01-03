
import { GradeLevel, Subject } from '../types';

export interface CurriculumSplit {
  term1: string[];
  term2: string[];
}

export const CURRICULUM_DATA: Record<string, Record<string, CurriculumSplit>> = {
  // ==========================================
  // الصف الأول الثانوي (نظام 2026 المطور)
  // ==========================================
  [GradeLevel.GRADE_10]: {
    [Subject.ARABIC]: {
      term1: [
        "نص: قيم وعادات (حاتم الطائي)",
        "النحو: الأفعال الناقصة والتامة (كان وأخواتها)",
        "البلاغة: الحقيقة والمجاز + التشبيه",
        "الأدب: الأدب في العصر الجاهلي",
        "النحو: أفعال المقاربة والرجاء والشروع (كاد وأخواتها)",
        "قصة عنترة بن شداد (الفصول 1-4)"
      ],
      term2: [
        "نص: البيت وطن (ابن الرومي)",
        "النحو: إعمال اسم الفاعل وصيغ المبالغة",
        "النحو: إعمال اسم المفعول",
        "البلاغة: الاستعارة المكنية والتصريحية",
        "الأدب: عصر صدر الإسلام والأدب الأموي",
        "قصة عنترة بن شداد (الفصول 5-8)"
      ]
    },
    [Subject.ENGLISH]: {
      term1: [
        "Unit 1: Getting Away (Conservation & Ecotourism)",
        "Unit 2: Supporting the Community",
        "Unit 3: Improving Lives (Health & Technology)",
        "Grammar: Past Simple vs Past Continuous",
        "Grammar: Present Perfect Simple",
        "The Treasure Island: Chapters 1-3"
      ],
      term2: [
        "Unit 4: Making New Friends",
        "Unit 5: Communication",
        "Unit 6: Learning from Literature",
        "Grammar: Articles (A, An, The)",
        "Grammar: Future Forms",
        "The Treasure Island: Chapters 4-6"
      ]
    },
    [Subject.INTEGRATED_SCIENCES]: {
      term1: [
        "الوحدة الأولى: النظم البيئية المائية والبرية (الاستدامة)",
        "الوحدة الثانية: الجزيئات البيولوجية الكبيرة (الكيمياء الحيوية)",
        "الوحدة الثالثة: التفاعلات الكيميائية في الكائنات الحية (الإنزيمات)",
        "تحديات ندرة المياه وتكنولوجيا تحلية المياه"
      ],
      term2: [
        "الوحدة الرابعة: القوة والحركة في الأنظمة الحيوية (الفيزياء الحيوية)",
        "الوحدة الخامسة: الغلاف الجوي وتغير المناخ (علوم الأرض والكون)",
        "الوحدة السادسة: الطاقة المتجددة (الخلايا الشمسية والهيدروجين الأخضر)"
      ]
    },
    [Subject.MATH]: {
      term1: [
        "الجبر: مقدمة عن الأعداد المركبة",
        "الجبر: تحديد نوع جذري المعادلة وتكوينها",
        "المثلثات: القياس الدائري والستيني والزوايا الموجهة",
        "الهندسة: تشابه المضلعات والمثلثات ونظريات التناسب"
      ],
      term2: [
        "الجبر: إشارة الدالة وحل المتباينات",
        "المثلثات: الدوال المثلثية والحل العام للمعادلات",
        "الهندسة: تطبيقات التناسب في الدائرة وقوة النقطة",
        "الهندسة: المتجهات والعمليات عليها"
      ]
    },
    [Subject.GERMAN]: {
      term1: ["Lektion 1: Hallo! (Alphabet & Kennenlernen)", "Lektion 2: Meine Familie", "Grammatik: Verben im Präsens"],
      term2: ["Lektion 3: Essen und Trinken", "Lektion 4: Meine Wohnung", "Grammatik: Akkusativ (den/einen)"]
    },
    [Subject.FRENCH]: {
      term1: ["Unité 1: Le club de ma classe", "Grammaire: Les articles indéfinis", "Grammaire: Verbe Être et Avoir"],
      term2: ["Unité 2: Le club des artistes", "Unité 3: Le club des lecteurs", "Grammaire: Les adjectifs possessifs"]
    }
  },

  // ==========================================
  // الصف الثاني الثانوي (نظام 2026 المختصر)
  // ==========================================
  [GradeLevel.GRADE_11]: {
    [Subject.ENGLISH]: {
      term1: [
        "Unit 1: Staying Healthy",
        "Unit 2: Eating Around the World",
        "Unit 3: The Future of Food",
        "Grammar: Modal Verbs (Obligation & Necessity)",
        "Grammar: Comparatives & Superlatives"
      ],
      term2: [
        "Unit 4: English Around the World",
        "Unit 5: Being Smart Online",
        "Unit 6: Great Expectations (Selected Parts)",
        "Grammar: Reported Speech",
        "Grammar: Relative Clauses"
      ]
    },
    [Subject.PHYSICS]: {
      term1: ["الفصل الأول: الحركة الاهتزازية والموجية", "الفصل الثاني: الضوء (الانعكاس، الانكسار، التداخل، الحيود)", "الفصل الثالث: المنشور الثلاثي والزاوية الحرجة"],
      term2: ["الفصل الرابع: ميكانيكا الموائع الساكنة (الكثافة والضغط)", "الفصل الخامس: قوانين الغازات (بويل، شارل، الضغط)"]
    },
    [Subject.CHEMISTRY]: {
      term1: ["الباب الأول: بنية الذرة (من دالتون إلى بور والنظرية الحديثة)", "الباب الثاني: الجدول الدوري وتدرج الخواص"],
      term2: ["الباب الثالث: الروابط الكيميائية وأشكال الجزيئات", "الباب الرابع: الكيمياء الكهربية والتحليل الكهربي"]
    },
    [Subject.BIOLOGY]: {
      term1: ["التغذية الذاتية في النبات", "التغذية غير الذاتية في الإنسان", "النقل في النبات والحيوان"],
      term2: ["التنفس الخلوي", "الإخراج في الكائنات الحية", "الإحساس في النبات والإنسان"]
    }
  },

  // ==========================================
  // الصف الثالث الثانوي (نظام الـ 5 مواد - 2026)
  // ==========================================
  [GradeLevel.GRADE_12]: {
    [Subject.ENGLISH]: {
      term1: [
        "Unit 1: Read all about it!",
        "Unit 2: Her Story",
        "Unit 3: Beyond Imagination",
        "Grammar: Past Perfect vs Past Simple",
        "Grammar: Used to / Be used to"
      ],
      term2: [
        "Unit 4: Taking care of ourselves",
        "Unit 5: Work-life balance",
        "Unit 6: What do you do?",
        "Grammar: Causative (Have/Get)",
        "Grammar: Phrasal Verbs"
      ]
    },
    [Subject.PHYSICS]: {
      term1: ["الفصل الأول: التيار الكهربي وقوانين كيرشوف", "الفصل الثاني: التأثير المغناطيسي وأجهزة القياس", "الفصل الثالث: الحث الكهرومغناطيسي"],
      term2: ["الفصل الرابع: دوائر التيار المتردد", "الفصل الخامس: ازدواجية الموجة والجسيم", "الفصل السادس: الأطياف الذرية والالكترونيات الحديثة"]
    },
    [Subject.CHEMISTRY]: {
      term1: ["الباب الأول: العناصر الانتقالية", "الباب الثاني: التحليل الكيميائي", "الباب الثالث: الاتزان الكيميائي"],
      term2: ["الباب الرابع: الكيمياء الكهربية", "الباب الخامس: الكيمياء العضوية (الهيدروكربونات ومشتقاتها)"]
    },
    [Subject.BIOLOGY]: {
      term1: ["الدعامة والحركة", "التنسيق الهرموني", "التكاثر في الكائنات الحية"],
      term2: ["المناعة في الكائنات الحية", "البيولوجيا الجزيئية (DNA & RNA)"]
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
