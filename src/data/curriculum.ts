
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
      term1: ["نص: قيم وعادات (حاتم الطائي)", "النحو: الأفعال الناقصة والتامة", "البلاغة: التشبيه (أنواعه وأركانه)", "الأدب: الأدب في العصر الجاهلي", "قصة عنترة بن شداد (الفصول 1-4)"],
      term2: ["نص: البيت وطن", "النحو: إعمال اسم الفاعل والمفعول وصيغ المبالغة", "البلاغة: الاستعارة (المكنية والتصريحية)", "الأدب: الأدب في صدر الإسلام والأموي", "قصة عنترة بن شداد (الفصول 5-8)"]
    },
    [Subject.ENGLISH]: {
      term1: ["Unit 1: Getting Away", "Unit 2: Supporting the Community", "Unit 3: Improving Lives", "Grammar: Past Simple & Continuous", "Treasure Island: Chapters 1-3"],
      term2: ["Unit 4: Making New Friends", "Unit 5: Communication", "Unit 6: Learning from Literature", "Grammar: Future Forms & Present Simple for Future", "Treasure Island: Chapters 4-6"]
    },
    [Subject.INTEGRATED_SCIENCES]: {
      term1: ["المحور الأول: استدامة النظم البيئية المائية", "المحور الثاني: دور الكيمياء في استدامة الموارد المائية", "المحور الثالث: الفيزياء في المحيطات والبحار"],
      term2: ["المحور الرابع: التغيرات المناخية وأثرها على البيئة", "المحور الخامس: الطاقة المتجددة وكيمياء المستقبل", "المحور السادس: التوازن البيئي والتنوع البيولوجي"]
    },
    [Subject.MATH]: {
      term1: ["الجبر: الأعداد المركبة", "الجبر: تحديد نوع جذري المعادلة التربيعية", "المثلثات: القياس الدائري والستيني", "الهندسة: تشابه المضلعات والمثلثات"],
      term2: ["الجبر: بحث إشارة الدالة وحل المتباينات", "المثلثات: الدوال المثلثية والزوايا المنتسبة", "الهندسة: التناسب في الدائرة", "الهندسة: نظريات التناسب في المثلث"]
    },
    [Subject.HISTORY]: {
      term1: ["الوحدة الأولى: مدخل لدراسة التاريخ والحضارة", "الحضارة المصرية القديمة (السياسية والإدارية)", "الحياة الاقتصادية والاجتماعية في مصر القديمة"],
      term2: ["الحياة الدينية والثقافية والفنية في مصر القديمة", "حضارة بلاد العراق القديم", "حضارة فينيقيا والعلاقات مع مصر"]
    },
    [Subject.PHILOSOPHY]: {
      term1: ["الوحدة الأولى: مبادئ التفكير الفلسفي", "نشأة الفلسفة وتعريفها وأهميتها", "خصائص التفكير الفلسفي ومهاراته"],
      term2: ["مبادئ التفكير العلمي", "خصائص التفكير العلمي وخطواته", "التفكير الناقد والتفكير الإبداعي"]
    },
    [Subject.RELIGION]: {
      term1: ["من عقيدة المسلم (الإيمان بالله)", "القرآن الكريم: سورة لقمان", "السيرة: دعوة الرسول ﷺ في مكة", "العبادات: الصلاة والخشوع"],
      term2: ["الإسلام والقضايا المعاصرة", "آداب الحوار في الإسلام", "السيرة: الهجرة وبناء الدولة", "الشخصيات الإسلامية: الإمام البخاري"]
    },
    [Subject.GERMAN]: {
      term1: ["Lektion 1: Hallo! (Greetings/Introduction)", "Lektion 2: Meine Familie und ich", "Grammatik: Verben im Präsens"],
      term2: ["Lektion 3: Essen und Trinken", "Lektion 4: Meine Wohnung/Zimmer", "Grammatik: Nominativ und Akkusativ"]
    },
    [Subject.FRENCH]: {
      term1: ["Unité 1: Le club de ma classe (Salutations/Couleurs)", "Unité 2: Le club des artistes (Matériel scolaire)", "Grammaire: Articles et Verbes (Avoir/Être)"],
      term2: ["Unité 3: Le club des lecteurs", "Unité 4: Le club des athlètes", "Grammaire: Les adjectifs possessifs"]
    }
  },

  // ==========================================
  // الصف الثاني الثانوي (علمي وأدبي)
  // ==========================================
  [GradeLevel.GRADE_11]: {
    [Subject.ARABIC]: {
      term1: ["إعراب الفعل المضارع (نصب/جزم)", "اقتران جواب الشرط بالفاء", "المصادر (الثلاثية وغير الثلاثية)", "الأدب: المعلقات وفن الخطابة"],
      term2: ["أسلوب الاختصاص", "أسلوب النداء التعجبي", "لا النافية للجنس", "الأدب: الغزل في العصر العباسي والموشحات"]
    },
    [Subject.ENGLISH]: {
      term1: ["Unit 1: Staying Healthy", "Unit 2: Eating Around the World", "Unit 3: The Future of Food", "Grammar: Modals & Suggestions"],
      term2: ["Unit 4: English in the World", "Unit 5: Being Smart Online", "Unit 6: Different Beliefs", "Grammar: Reported Speech & Conditionals"]
    },
    [Subject.MATH]: {
      term1: ["الجبر: الدوال الحقيقية والتمثيل البياني", "الجبر: اللوغاريتمات والأسس", "المثلثات: قاعدة الجيب وجيب التمام"],
      term2: ["التفاضل: النهايات والاتصال", "الاستاتيكا: القوى والاتزان", "الديناميكا: الحركة المنتظمة والتغير"],
    },
    [Subject.PHYSICS]: {
      term1: ["الحركة الموجية", "خصائص الضوء (انعكاس، انكسار، تداخل، حيود)", "السريان اللزوجة"],
      term2: ["خواص الموائع الساكنة", "الضغط والضغط الجوي", "قوانين الغازات (بويل، شارل، الضغط)"]
    },
    [Subject.CHEMISTRY]: {
      term1: ["بنية الذرة ونظريات العلماء", "الجدول الدوري الحديث", "تدرج خواص العناصر في الجدول"],
      term2: ["الروابط والكيمياء الفيزيائية", "عناصر الفئة s", "عناصر الفئة p والغازات النبيلة"]
    },
    [Subject.BIOLOGY]: {
      term1: ["التغذية الذاتية وغير الذاتية", "النقل في النبات والإنسان"],
      term2: ["التنفس الخلوي", "الإخراج في الكائنات الحية", "الإحساس في النبات والإنسان"]
    },
    [Subject.HISTORY]: {
      term1: ["مصر ومنذ الفتح الإسلامي", "الدولة الطولونية والإخشيدية", "الدولة الفاطمية"],
      term2: ["الدولة الأيوبية والمملوكية", "الحياة العلمية والفنية في مصر الإسلامية"]
    },
    [Subject.GEOGRAPHY]: {
      term1: ["جغرافية التنمية ومجالاتها", "جغرافية موارد مصر", "الموارد المائية وأساليب إدارتها"],
      term2: ["التنمية الزراعية والحيوانية", "التنمية الصناعية والسياحية في الوطن العربي"]
    },
    [Subject.PSYCHOLOGY]: {
      term1: ["نشأة علم النفس وتطوره", "دوافع السلوك الإنساني والانفعالات"],
      term2: ["العمليات المعرفية (الإحساس، الانتباه، الإدراك)", "الذاكرة والتفكير"]
    },
    [Subject.GERMAN]: {
      term1: ["Lektion 5: Mein Tag", "Lektion 6: Freizeit", "Grammatik: Trennbare Verben"],
      term2: ["Lektion 7: Reisen", "Lektion 8: Kleidung والطقس", "Grammatik: Perfekt"]
    },
    [Subject.FRENCH]: {
      term1: ["Unité 1: Le club des citadins", "Unité 2: Le club des photographes"],
      term2: ["Unité 3: Le club des looks", "Unité 4: Le club des voyageurs"]
    }
  },

  // ==========================================
  // الصف الثالث الثانوي (المنهج النهائي)
  // ==========================================
  [GradeLevel.GRADE_12]: {
    [Subject.ARABIC]: {
      term1: ["مدرسة الإحياء والبعث", "الاتجاه الوجداني ومدرسة الديوان", "النحو: الوحدة 1-4 (النطق، الأبنية، النواسخ)", "قصة الأيام: الجزء الأول"],
      term2: ["مدرسة أبوللو والمهاجر والواقعية", "النثر: المقال والقصة القصيرة والرواية", "النحو: الوحدة 5-7 (الأفعال، التوابع، الممنوع من الصرف)", "قصة الأيام: الجزء الثاني"]
    },
    [Subject.ENGLISH]: {
      term1: ["Unit 1: Read all about it!", "Unit 2: Her Story", "Unit 3: Beyond Imagination", "Grammar: Narrative Tenses & Modals"],
      term2: ["Unit 4: Taking care", "Unit 5: Work-life balance", "Unit 6: What do you do?", "Grammar: Causative & Future Continuous"]
    },
    [Subject.MATH]: {
      term1: ["التفاضل: اشتقاق الدوال المثلثية والمعدلات الزمنية", "الجبر: التباديل والتوافيق ونظرية ذات الحدين", "الاستاتيكا: الاحتكاك والعزوم والقوى المتوازية"],
      term2: ["التكامل: الدوال اللوغاريتمية والأسية", "الهندسة الفراغية: المتجهات والخط المستقيم والكرة", "الديناميكا: قوانين نيوتن والدفع والتصادم"]
    },
    [Subject.PHYSICS]: {
      term1: ["الفصل 1: التيار الكهربي وقانون أوم وكيرشوف", "الفصل 2: التأثير المغناطيسي للتيار الكهربي", "الفصل 3: الحث الكهرومغناطيسي"],
      term2: ["الفصل 4: دوائر التيار المتردد", "الفصل 5: ازدواجية الموجة والجسيم", "الفصل 6-8: الفيزياء الحديثة والأطياف والإلكترونيات"]
    },
    [Subject.CHEMISTRY]: {
      term1: ["الباب 1: العناصر الانتقالية", "الباب 2: التحليل الكيميائي", "الباب 3: الاتزان الكيميائي"],
      term2: ["الباب 4: الكيمياء الكهربية", "الباب 5: الكيمياء العضوية (الأليفاتية والأروماتية)"]
    },
    [Subject.BIOLOGY]: {
      term1: ["الدعامة والحركة في الكائنات الحية", "التنسيق الهرموني", "التكاثر في الكائنات الحية"],
      term2: ["المناعة في الكائنات الحية", "البيولوجيا الجزيئية (DNA)", "تخليق البروتين (RNA) والهندسة الوراثية"]
    },
    [Subject.GEOLOGY]: {
      term1: ["الباب 1: علم الجيولوجيا ومادة الأرض", "الباب 2: المعادن والبلورات", "الباب 3: الصخور (نارية، رسوبية، متحولة)"],
      term2: ["الباب 4: الحركات الأرضية والانجراف القاري", "الباب 5: العمل الجيولوجي للرياح والأمطار والبحار", "علوم البيئة والموارد"]
    },
    [Subject.HISTORY]: {
      term1: ["الفصل 1: الحملة الفرنسية على مصر", "الفصل 2: بناء الدولة الحديثة في مصر (محمد علي)", "الفصل 3: مصر منذ الثورة العرابية حتى الاحتلال"],
      term2: ["الفصل 4: مصر من الحرب العالمية الأولى لثورة 23 يوليو", "الفصل 5-8: الاستعمار في البلاد العربية والقضية الفلسطينية"]
    },
    [Subject.GEOGRAPHY]: {
      term1: ["مدخل لدراسة الجغرافيا السياسية", "الدولة: تعريفها وأنواعها ومقوماتها الطبيعية", "المقومات البشرية وقوة الدولة"],
      term2: ["الحدود السياسية وأنواعها والمشكلات المرتبطة بها", "التكتلات الاقتصادية والأحلاف العسكرية", "النظام العالمي الجديد"]
    },
    [Subject.GERMAN]: {
      term1: ["Lektion 9: Berufe", "Lektion 10: Gesundheit", "Grammatik: Modalverben im Präteritum"],
      term2: ["Lektion 11: In der Stadt", "Lektion 12: Kundenservice", "Grammatik: Konjunktiv II (höfliche Bitte)"]
    },
    [Subject.FRENCH]: {
      term1: ["Unité 1: Le club des sportifs", "Unité 2: Le club des gourmands"],
      term2: ["Unité 3: Le club des explorateurs", "Unité 4: Le club des voyageurs"]
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
