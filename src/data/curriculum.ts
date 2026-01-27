
import { GradeLevel, Subject } from '../types';

export interface CurriculumSplit {
  term1: string[];
  term2: string[];
}

export const CURRICULUM_DATA: Record<string, Record<string, CurriculumSplit>> = {
  [GradeLevel.GRADE_10]: {
    [Subject.ARABIC]: {
      term1: [
        "حاتم الطائي (قراءة وتحليل)", "الأفعال الناقصة والتامة (نحو)", "التشبيه وأركانه (بلاغة)", "العصر الجاهلي (أدب)", "تطبيقات شاملة على الوحدة الأولى", "مراجعة شهر أكتوبر",
        "قيم اجتماعية (قراءة)", "كاد وأخواتها (نحو)", "الاستعارة المكنية (بلاغة)", "النثر في العصر الجاهلي (أدب)", "وا إسلاماه: الفصول 1-4 (قصة)", "تطبيقات على الوحدة الثانية", "مراجعة شهر نوفمبر"
      ],
      term2: [
        "البيت وطن (نصوص)", "أعمال اسم الفاعل والمفعول (نحو)", "الاستعارة التصريحية (بلاغة)", "عصر صدر الإسلام (أدب)", "وا إسلاماه: الفصول 5-8 (قصة)", "تطبيقات الوحدة الثالثة", "مراجعة شهر مارس",
        "الحضارة العربية (قراءة)", "صيغ المبالغة (نحو)", "الكناية والمجاز (بلاغة)", "الأدب الأموي (أدب)", "تطبيقات الوحدة الرابعة", "مراجعة نهائية شاملة"
      ]
    },
    [Subject.ENGLISH]: {
      term1: [
        "Unit 1: Getting Away (Vocabulary & Reading)", "Unit 1: Past Simple & Continuous (Grammar)", "Unit 1: Practical Writing Skills", "Unit 1: Review & Self-Assessment",
        "Unit 2: Supporting Community (Vocab & Reading)", "Unit 2: Present Perfect (Grammar)", "Unit 2: Listening & Speaking Apps", "Unit 2: Review",
        "Unit 3: Improving Lives (Vocab & Reading)", "Unit 3: Narrative Tenses (Grammar)", "Unit 3: Story Writing Practice", "Unit 3: Review"
      ],
      term2: [
        "Unit 4: Making New Friends (Vocab & Reading)", "Unit 4: Articles & Quantifiers (Grammar)", "Unit 4: Social Interaction Skills", "Unit 4: Review",
        "Unit 5: Communication (Vocab & Reading)", "Unit 5: Future Forms (Grammar)", "Unit 5: Tech-based Applications", "Unit 5: Review",
        "Unit 6: Learning from Literature (Vocab & Reading)", "Unit 6: Relative Clauses (Grammar)", "Unit 6: Review"
      ]
    },
    [Subject.FRENCH]: {
      term1: [
        "Unité 1: Le club des citadins (Vocabulaire)", "Unité 1: Les articles définis (Grammaire)", "Unité 1: Décrire sa ville (Application)", "Unité 1: Révision générale",
        "Unité 2: Le club des artistes (Vocabulaire)", "Unité 2: Les couleurs et les formes (Grammaire)", "Unité 2: Parler de ses goûts (Application)", "Unité 2: Révision"
      ],
      term2: [
        "Unité 3: Le club des lecteurs (Vocabulaire)", "Unité 3: L'heure et l'emploi du temps (Grammaire)", "Unité 3: Vie scolaire (Application)", "Unité 3: Révision",
        "Unité 4: Le club des athlètes (Vocabulaire)", "Unité 4: Les parties du corps (Grammaire)", "Unité 4: Description physique (Application)", "Unité 4: Révision"
      ]
    },
    [Subject.GERMAN]: {
      term1: [
        "Lektion 1: Hallo! (Wortschatz)", "Lektion 1: Personalpronomen (Grammatik)", "Lektion 1: Begrüßung (Anwendung)", "Lektion 1: Wiederholung",
        "Lektion 2: Meine Familie (Wortschatz)", "Lektion 2: Verbkonjugation (Grammatik)", "Lektion 2: Stammbaum (Anwendung)", "Lektion 2: Wiederholung"
      ],
      term2: [
        "Lektion 3: Essen und Trinken (Wortschatz)", "Lektion 3: Akkusativ (Grammatik)", "Lektion 3: Einkaufen (Anwendung)", "Lektion 3: Wiederholung",
        "Lektion 4: Meine Wohnung (Wortschatz)", "Lektion 4: Negation (Grammatik)", "Lektion 4: Möbel (Anwendung)", "Lektion 4: Wiederholung"
      ]
    },
    [Subject.MATH]: {
      term1: [
        "الأعداد المركبة (جبر)", "تحديد نوع جذري المعادلة التربيعية (جبر)", "تطبيقات على المعادلة التربيعية", "مراجعة الجبر",
        "تشابه المضلعات والمثلثات (هندسة)", "تطبيقات على التشابه", "مراجعة الهندسة",
        "القياس الدائري والستيني (مثلثات)", "تطبيقات الزوايا المنتسبة", "مراجعة المثلثات"
      ],
      term2: [
        "المصفوفات والعمليات عليها (جبر)", "المحددات والمعكوس الضربي (جبر)", "تطبيقات المصفوفات", "مراجعة الجبر",
        "المتجهات والعمليات عليها (هندسة)", "تطبيقات هندسية وفيزيائية للمتجهات", "مراجعة الهندسة",
        "حل المعادلات المثلثية (مثلثات)", "زوايا الارتفاع والانخفاض", "مراجعة نهائية"
      ]
    },
    [Subject.INTEGRATED_SCIENCES]: {
      term1: [
        "بيئة المحيطات والبحار (شرح)", "النظم البيئية المائية (تطبيقات)", "كيمياء المياه والاستدامة (شرح)", "تجارب جودة المياه (عملي)", "مراجعة الوحدة الأولى"
      ],
      term2: [
        "التغير المناخي والبيئي (شرح)", "الطاقة المتجددة (تطبيقات)", "التنوع البيولوجي (شرح)", "حماية الموارد الطبيعية (عملي)", "مراجعة نهائية"
      ]
    },
    [Subject.COMPUTER_SCIENCE]: {
      term1: [
        "مقدمة في علوم الحاسب (نظري)", "أساسيات لغة Python (شرح)", "المتغيرات وأنواع البيانات (تطبيقات)", "العمليات الحسابية (عملي)", "مراجعة الأساسيات"
      ],
      term2: [
        "الجمل الشرطية (شرح)", "الحلقات التكرارية Loops (شرح)", "بناء مشاريع برمجية (تطبيقات)", "أساسيات الذكاء الاصطناعي (نظري)", "مراجعة نهائية"
      ]
    },
    [Subject.HISTORY]: {
      term1: ["مدخل لدراسة التاريخ", "حضارة مصر القديمة", "الحياة السياسية والإدارية", "تطبيقات على التاريخ القديم", "مراجعة الوحدة الأولى"],
      term2: ["الحياة الدينية والثقافية", "حضارة بلاد العراق القديم", "حضارة فينيقيا", "التواصل الحضاري المصري", "مراجعة نهائية"]
    },
    [Subject.GEOGRAPHY]: {
      term1: ["مدخل لعلم الجغرافيا", "موقع مصر وأهميته", "التكوينات الجيولوجية", "تضاريس سطح مصر", "مراجعة الجغرافيا الطبيعية"],
      term2: ["المناخ في مصر", "النبات الطبيعي والحيوان البري", "السكان في مصر", "المشكلات السكانية", "مراجعة نهائية"]
    },
    [Subject.PHILOSOPHY]: {
      term1: ["مبادئ التفكير الفلسفي", "التفكير الإنساني وأساليبه", "نشأة الفلسفة وأهميتها", "مراجعة الفصل الأول"],
      term2: ["خصائص التفكير الفلسفي", "مهارات التفكير الفلسفي", "التفكير الناقد والإبداعي", "مراجعة نهائية"]
    },
    [Subject.RELIGION]: {
      term1: ["عقيدة الإيمان بالله", "سورة الحجرات (تفسير)", "السيرة النبوية (الجزء الأول)", "مراجعة"],
      term2: ["العبادات في الإسلام", "حقوق الإنسان في الإسلام", "عمارة الأرض", "مراجعة نهائية"]
    },
    [Subject.NATIONAL_EDUCATION]: {
      term1: ["الشخصية المصرية", "المواطنة الصالحة", "مراجعة"],
      term2: ["الشباب وبناء المجتمع", "الدولة وسيادة القانون", "مراجعة نهائية"]
    }
  },
  [GradeLevel.GRADE_11]: {
    [Subject.ARABIC]: {
      term1: [
        "المعلقات (أدب ونصوص)", "نصب وجزم الفعل المضارع (نحو)", "المحسنات البديعية (بلاغة)", "وا إسلاماه: الفصول 1-8", "تطبيقات الأدب الجاهلي", "مراجعة"
      ],
      term2: [
        "الأدب في العصر العباسي", "أسلوب الاختصاص والتحذير (نحو)", "الإيجاز والإطناب (بلاغة)", "مصر تتحدث عن نفسها (نصوص)", "وا إسلاماه: الفصول 9-16", "مراجعة نهائية"
      ]
    },
    [Subject.ENGLISH]: {
      term1: [
        "Unit 1: Staying Healthy (Reading)", "Unit 1: Modals of Necessity (Grammar)", "Unit 1: First Aid Apps", "Unit 1: Review",
        "Unit 2: Eating Around the World", "Unit 2: Comparison (Grammar)", "Unit 2: Review",
        "Unit 3: Future of Food", "Unit 3: Future Tenses (Grammar)", "Unit 3: Review"
      ],
      term2: [
        "Unit 4: Changing World", "Unit 4: Conditionals 0 & 1 (Grammar)", "Unit 4: Review",
        "Unit 5: Being Smart Online", "Unit 5: Conditionals 2 & 3 (Grammar)", "Unit 5: Review",
        "Unit 6: Learning from experience", "Unit 6: Regrets (Grammar)", "Unit 6: Review"
      ]
    },
    [Subject.PHYSICS]: {
      term1: [
        "الحركة الاهتزازية والموجية (شرح)", "انعكاس وانكسار الضوء (شرح)", "تداخل وحيود الضوء (تطبيقات)", "المنشور الثلاثي (عملي)", "مراجعة الضوء"
      ],
      term2: [
        "خواص الموائع الساكنة (شرح)", "الضغط الجوي وتطبيقاته (تطبيقات)", "قاعدة باسكال (شرح)", "قوانين الغازات (عملي)", "مراجعة الموائع والغازات"
      ]
    },
    [Subject.CHEMISTRY]: {
      term1: ["بنية الذرة والجدول الدوري (شرح)", "تدرج خواص العناصر (تطبيقات)", "الروابط الكيميائية (شرح)", "مراجعة الكيمياء العامة"],
      term2: ["عناصر الفئة s (شرح)", "عناصر الفئة p (شرح)", "كيمياء النيتروجين (تطبيقات)", "مراجعة نهائية"]
    },
    [Subject.BIOLOGY]: {
      term1: ["التغذية الذاتية والتمثيل (شرح)", "النقل في النبات والإنسان (تطبيقات)", "التنفس الخلوي (شرح)", "مراجعة الوحدة الأولى"],
      term2: ["الإخراج في الكائنات الحية (شرح)", "الإحساس في النبات (شرح)", "الإحساس في الإنسان (تطبيقات)", "مراجعة نهائية"]
    },
    [Subject.MATH]: {
      term1: ["الدوال الحقيقية ورسمها (جبر)", "نهايات الدوال (تفاضل)", "قوانين الجيب والجيب تمام (مثلثات)", "تطبيقات رياضية", "مراجعة"],
      term2: ["المتتابعات والمتسلسلات (جبر)", "الاشتقاق وقواعده (تفاضل)", "التباديل والتوافيق (جبر)", "الاحتمالات (إحصاء)", "مراجعة نهائية"]
    },
    [Subject.HISTORY]: {
      term1: ["مصر والفتح الإسلامي", "الدول المستقلة في مصر", "الأيوبيون والمماليك", "مراجعة العصور الوسطى"],
      term2: ["الحضارة الإسلامية وإسهاماتها", "مصر في العصر العثماني", "مصر والقضايا المعاصرة", "مراجعة نهائية"]
    },
    [Subject.GEOGRAPHY]: {
      term1: ["ماهية التنمية ومجالاتها", "تنمية الموارد البيئية", "التنمية الاقتصادية", "مراجعة جغرافيا التنمية"],
      term2: ["التنمية البشرية ومؤشراتها", "التخطيط للتنمية", "مشروعات تنموية في مصر", "مراجعة نهائية"]
    },
    [Subject.PHILOSOPHY]: {
      term1: ["الموقف الفلسفي", "الفلسفة والدين والعلم", "مراجعة الفلسفة"],
      term2: ["المنطق والحدود والقضايا", "الاستدلال المباشر", "مراجعة المنطق"]
    },
    [Subject.PSYCHOLOGY]: {
      term1: ["نشأة علم النفس وتطوره", "مجالات علم النفس ومناهجه", "الدوافع والانفعالات", "مراجعة علم النفس"],
      term2: ["العمليات المعرفية (إحساس، انتباه)", "الإدراك والذاكرة والتفكير", "مراجعة العمليات المعرفية"]
    },
    [Subject.RELIGION]: {
      term1: ["الإيمان واليوم الآخر", "تفسير سورة الإسراء", "مراجعة"],
      term2: ["فقه المعاملات", "سير الصحابة والتابعين", "مراجعة نهائية"]
    },
    [Subject.NATIONAL_EDUCATION]: {
      term1: ["حقوق الإنسان", "الأحزاب السياسية في مصر", "مراجعة"],
      term2: ["الديمقراطية والمواطنة", "المشاركة السياسية", "مراجعة نهائية"]
    }
  },
  [GradeLevel.GRADE_12]: {
    [Subject.ARABIC]: {
      term1: [
        "مدرسة الإحياء والبعث (أدب)", "غُربة وحنين (نصوص)", "المشتقات وإعمالها (نحو)", "التجربة الشعرية (بلاغة)", "الأيام: الجزء الأول (قصة)", "تطبيقات الأدب الكلاسيكي", "مراجعة"
      ],
      term2: [
        "مدارس الديوان وأبوللو والمهاجر (أدب)", "المساء، كم تشتكي، النسور (نصوص)", "النواسخ والمنصوبات والمجرورات (نحو)", "الرواية والمسرحية (أدب)", "الأيام: الجزء الثاني (قصة)", "مراجعة ليلة الامتحان"
      ]
    },
    [Subject.ENGLISH]: {
      term1: [
        "Unit 1: Read all about it (Reading)", "Unit 1: Past Tenses (Grammar)", "Unit 1: Practical Journalism", "Unit 1: Review",
        "Unit 2: Her Story (Vocab & Reading)", "Unit 2: Present Perfect (Grammar)", "Unit 2: Review",
        "Unit 3: Beyond imagination (Reading)", "Unit 3: Future Forms (Grammar)", "Unit 3: Review",
        "Great Expectations: Chapters 1-6"
      ],
      term2: [
        "Unit 7: Reach for the stars", "Unit 7: Conditionals (Grammar)", "Unit 7: Review",
        "Unit 8: Fact or Fiction", "Unit 8: Modals of Deduction (Grammar)", "Unit 8: Review",
        "Unit 9: Conservation (Vocab & Reading)", "Unit 9: Passive Voice (Grammar)", "Unit 9: Review",
        "Great Expectations: Chapters 7-12"
      ]
    },
    [Subject.FRENCH]: {
      term1: [
        "Unité 1: Le club des sportifs (Vocabulaire)", "Unité 1: Les articles partitifs (Grammaire)", "Unité 1: Les sports (Application)", "Unité 1: Révision",
        "Unité 2: Le club des gourmands (Vocabulaire)", "Unité 2: Le pronom (EN) (Grammaire)", "Unité 2: Les aliments (Application)", "Unité 2: Révision"
      ],
      term2: [
        "Unité 3: Explorer la ferme (Vocabulaire)", "Unité 3: Le passé composé (Grammaire)", "Unité 3: La vie rurale (Application)", "Unité 3: Révision",
        "Unité 4: En ville (Vocabulaire)", "Unité 4: Les pronoms (Y) (Grammaire)", "Unité 4: Transports (Application)", "Unité 4: Révision"
      ]
    },
    [Subject.GERMAN]: {
      term1: [
        "Lektion 9: Berufe (Wortschatz)", "Lektion 9: Modalverben (Grammatik)", "Lektion 9: Berufsleben (Anwendung)", "Lektion 9: Wiederholung",
        "Lektion 10: Gesundheit (Wortschatz)", "Lektion 10: Sollen (Grammatik)", "Lektion 10: Beim Arzt (Anwendung)", "Lektion 10: Wiederholung",
        "Lektion 11: In der Stadt (Wortschatz)", "Lektion 11: Imperativ (Grammatik)", "Lektion 11: Wiederholung"
      ],
      term2: [
        "Lektion 12: Feste (Wortschatz)", "Lektion 12: Ordinalzahlen (Grammatik)", "Lektion 12: Partys (Anwendung)", "Lektion 12: Wiederholung",
        "Lektion 13: Medien (Wortschatz)", "Lektion 13: Konjunktiv II (Grammatik)", "Lektion 13: Wiederholung",
        "Lektion 14: Kommunikation (Wortschatz)", "Lektion 14: Nebensätze (Grammatik)", "Lektion 14: Wiederholung"
      ]
    },
    [Subject.PHYSICS]: {
      term1: [
        "التيار الكهربي وقانون أوم (شرح)", "قوانين كيرشوف وتطبيقاتها (تطبيقات)", "التأثير المغناطيسي للتيار (شرح)", "أجهزة القياس الكهربي (تطبيقات)", "الحث الكهرومغناطيسي (شرح)", "الدينامو والمحول والمحرك (عملي)", "مراجعة الفيزياء الكهربية"
      ],
      term2: [
        "دوائر التيار المتردد (شرح)", "الفيزياء الحديثة وازدواجية الموجة (شرح)", "الأطياف الذرية والليزر (تطبيقات)", "الإلكترونيات الحديثة والترانزستور (شرح)", "مراجعة شاملة للمنهج"
      ]
    },
    [Subject.CHEMISTRY]: {
      term1: [
        "العناصر الانتقالية والحديد (شرح)", "التحليل الكيميائي الوصفي والكمي (عملي)", "الاتزان الكيميائي والآيوني (شرح)", "تطبيقات على الاتزان والترسيب", "مراجعة الكيمياء غير العضوية"
      ],
      term2: [
        "الكيمياء الكهربية والتحليلية (شرح)", "الكيمياء العضوية: الهيدروكربونات (شرح)", "الكيمياء العضوية: مشتقات الهيدروكربونات (شرح)", "تفاعلات المركبات العضوية (تطبيقات)", "مراجعة الكيمياء العضوية الشاملة"
      ]
    },
    [Subject.BIOLOGY]: {
      term1: [
        "الدعامة في الكائنات الحية (درس نظري)", "الحركة في الكائنات الحية (درس نظري)", "تطبيقات على الدعامة والحركة (تطبيق عملي)", "مراجعة الفصل الأول: الدعامة والحركة (مراجعة)",
        "التنسيق الهرموني في الكائنات الحية (درس نظري)", "الغدد الصماء في الإنسان (درس نظري)", "تطبيقات على الهرمونات والحالات المرضية (تطبيق عملي)", "مراجعة الفصل الثاني: التنسيق الهرموني (مراجعة)",
        "أنواع التكاثر في الكائنات الحية (درس نظري)", "التكاثر في النباتات الزهرية (درس نظري)", "التكاثر في الإنسان (درس نظري)", "تطبيقات دورة الطمث والإخصاب (تطبيق عملي)", "مراجعة الفصل الثالث: التكاثر (مراجعة)"
      ],
      term2: [
        "المناعة في النبات (درس نظري)", "المناعة في الإنسان (درس نظري)", "آلية عمل الجهاز المناعي (درس نظري)", "تطبيقات الأجسام المضادة والمناعة المكتسبة (تطبيق عملي)", "مراجعة الفصل الرابع: المناعة (مراجعة)",
        "الحمض النووي DNA (درس نظري)", "تضاعف وإصلاح DNA (درس نظري)", "تطبيقات تكنولوجيا DNA (تطبيق عملي)", "مراجعة الفصل الخامس: البيولوجيا الجزيئية (مراجعة)",
        "الأحماض النووية وتخليق البروتين (درس نظري)", "الهندسة الوراثية وتطبيقاتها (درس نظري)", "تطبيقات الجينوم البشري (تطبيق عملي)", "مراجعة الفصل السادس: تخليق البروتين (مراجعة)",
        "مراجعة ليلة الامتحان الشاملة (مراجعة نهائية)"
      ]
    },
    [Subject.MATH]: {
      term1: [
        "تفاضل: الاشتقاق وتطبيقاته (شرح)", "تكامل: قواعد التكامل الأساسية (شرح)", "جبر: الأعداد المركبة والتباديل (شرح)", "فراغية: المتجهات في الفضاء (تطبيقات)", "مراجعة"
      ],
      term2: [
        "تفاضل: نهايات الدوال الأسية واللوغاريتمية (شرح)", "تكامل: المساحات والحجوم (تطبيقات)", "جبر: المصفوفات والمحددات (شرح)", "إحصاء: الاحتمالات والارتباط (تطبيقات)", "مراجعة نهائية"
      ]
    },
    [Subject.GEOLOGY]: {
      term1: [
        "جيولوجيا الأرض ومكوناتها (درس نظري)", "المعادن والأنظمة البلورية (تطبيقات)", "الصخور النارية والرسوبية والمتحولة (درس نظري)", "دورة الصخور والبراكين (تطبيق عملي)", "مراجعة الباب الأول والثاني"
      ],
      term2: [
        "الحركات الأرضية والانجراف القاري (درس نظري)", "تكتونية الألواح والزلازل (تطبيقات)", "العلوم البيئية واستنزاف الموارد (درس نظري)", "تطبيقات حماية البيئة (تطبيق عملي)", "مراجعة نهائية"
      ]
    },
    [Subject.HISTORY]: {
      term1: ["الحملة الفرنسية على مصر والشام", "بناء الدولة الحديثة: عهد محمد علي", "الثورة العرابية والاحتلال البريطاني", "مراجعة التاريخ الحديث"],
      term2: ["ثورة 1919 والتحول للاستقلال", "الاستعمار في البلاد العربية", "ثورة 23 يوليو والحروب المعاصرة", "مراجعة نهائية"]
    },
    [Subject.GEOGRAPHY]: {
      term1: ["مدخل للجغرافيا السياسية", "الدولة ومقوماتها الطبيعية والبشرية", "النظام الانتخابي وقوة الدولة", "مراجعة الجغرافيا السياسية"],
      term2: ["الحدود السياسية وأنواعها", "التكتلات الاقتصادية والأحلاف العسكرية", "النظام العالمي الجديد", "مراجعة نهائية"]
    },
    [Subject.PHILOSOPHY]: {
      term1: ["فلسفة البيئة وقضايا العصر", "فلسفة الأخلاق البيولوجية والطبية", "أخلاقيات المهنة", "مراجعة الفلسفة"],
      term2: ["الاستدلال الاستقرائي والمنهج العلمي", "الاستنباط الرياضي والذكاء الاصطناعي", "مراجعة المنطق"]
    },
    [Subject.PSYCHOLOGY]: {
      term1: ["الذكاء والتعلم ونظرياته", "النمو الإنساني ومراحله", "مراجعة علم النفس"],
      term2: ["الشخصية وأنواعها", "الاتجاهات والقيم", "التوافق النفسي والإحباط", "مراجعة نهائية"]
    },
    [Subject.RELIGION]: {
      term1: ["عقيدة التوحيد (شرح)", "سورة لقمان (تفسير)", "قضايا فقهية معاصرة", "مراجعة"],
      term2: ["سيرة النبي والصحابة", "حقوق المرأة والأسرة في الإسلام", "مراجعة نهائية"]
    },
    [Subject.NATIONAL_EDUCATION]: {
      term1: ["القانون والدستور المصرى", "الديمقراطية والأحزاب السياسية", "مراجعة"],
      term2: ["الشباب والمواطنة", "المشاركة السياسية والانتخابات", "مراجعة نهائية"]
    }
  }
};

export const getCurriculumFor = (grade: GradeLevel, subject: Subject): CurriculumSplit => {
  return CURRICULUM_DATA[grade]?.[subject] || { term1: [], term2: [] };
};
