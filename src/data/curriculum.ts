import { GradeLevel, Subject } from '../types';

// واجهة جديدة لجعل كل درس كائن متكامل بدلاً من نص فقط
export interface Lesson {
  title: string;
  visualDescription?: string; // خاصية اختيارية للوصف البصري
}

export interface CurriculumSplit {
  term1: Lesson[]; // تم التحديث ليستخدم مصفوفة من الدروس
  term2: Lesson[]; // تم التحديث ليستخدم مصفوفة من الدروس
}

// Data Population - Updated based on Egyptian Ministry Curriculum (2025/2026)
const CURRICULUM_DATA: Record<string, Record<string, CurriculumSplit>> = {
  [GradeLevel.GRADE_10]: {
    [Subject.MATH]: {
      term1: [
        { title: "الجبر: حل معادلات الدرجة الثانية في متغير واحد" },
        { 
          title: "الجبر: مقدمة عن الأعداد المركبة",
          visualDescription: "تخيل أن خط الأعداد العادي الذي تعرفه (1, 2, 3, -1, -2...) هو مجرد 'شارع' أفقي مستقيم.\n\nالضرب في -1: عندما تضرب أي رقم في -1، تخيل أنك تقف عند الرقم، ثم تقوم بعمل دورة كاملة (180 درجة) على خط الأعداد لتهبط عند نظيره السالب.\n\nالضرب في i (العدد التخيلي): الآن، تخيل أن i هي 'خطوة سحرية'. إنها نصف دورة (90 درجة) فقط عكس اتجاه عقارب الساعة. إذا كنت تقف عند الرقم 3 على الشارع الأفقي، وضربته في i، فأنت تقفز 90 درجة إلى شارع جديد عمودي وتقف عند '3i'. إذا ضربت في i مرة أخرى، فأنت تقوم بنصف دورة أخرى (90 درجة أخرى) وتهبط عند -3 على الشارع الأفقي الأصلي.\n\nالخلاصة: العدد التخيلي i ليس 'تخيليًا' بل هو أمر بالدوران 90 درجة، يأخذنا من عالم الأعداد المسطح إلى بُعد جديد."
        },
        { title: "الجبر: تحديد نوع جذري المعادلة التربيعية" },
        { title: "الجبر: العلاقة بين جذري المعادلة ومعاملاتها" },
        { title: "الجبر: إشارة الدالة (الثابتة - الخطية - التربيعية)" },
        { title: "الجبر: متباينة الدرجة الثانية في مجهول واحد" },
        { title: "حساب المثلثات: الزاوية الموجهة والقياس الستيني والدائري" },
        { title: "حساب المثلثات: الدوال المثلثية ومقلوباتها وإشاراتها" },
        { title: "حساب المثلثات: الزوايا المنتسبة" },
        { title: "الهندسة: تشابه المضلعات والمثلثات (الحالات الثلاث)" },
        { title: "الهندسة: نظريات التناسب في المثلث (تاليس - المنصفات - قوة النقطة)" }
      ],
      term2: [
        { title: "الجبر: تنظيم البيانات في مصفوفات" },
        { title: "الجبر: العمليات على المصفوفات (جمع - طرح - ضرب)" },
        { title: "الجبر: المحددات والمعكوس الضربي للمصفوفة" },
        { title: "الجبر: حل المعادلات الخطية (كِرامر - المعكوس)" },
        { title: "الجبر: البرمجة الخطية والحل الأمثل" },
        { title: "حساب المثلثات: المتطابقات المثلثية" },
        { title: "حساب المثلثات: حل المعادلات المثلثية" },
        { title: "حساب المثلثات: حل المثلث (قاعدة الجيب وجيب التمام)" },
        { title: "حساب المثلثات: زوايا الارتفاع والانخفاض" },
        { title: "الهندسة: الكميات القياسية والمتجهة والقطعة المستقيمة الموجهة" },
        { title: "الهندسة: المتجهات والعمليات عليها وتقسيم قطعة مستقيمة" },
        { title: "الهندسة: معادلة الخط المستقيم (الصور المختلفة)" },
        { title: "الهندسة: قياس الزاوية بين مستقيمين وبُعد نقطة عن مستقيم" }
      ]
    },
    // ... تم تحويل بقية المواد والدروس إلى نفس الهيكل الجديد ...
    [Subject.ARABIC]: {
      term1: [
        { title: "الوحدة الأولى: قيم عربية (مكارم الأخلاق - حاتم الطائي)" },
        { title: "النحو: الأفعال الناقصة والتامة (كان وأخواتها)" },
        { title: "النحو: أفعال المقاربة والرجاء والشروع (كاد وأخواتها)" },
        { title: "البلاغة: التعبير الحقيقي والمجازي - التشبيه وأنواعه" },
        { title: "الأدب: العصر الجاهلي (سماته - المعلقات)" },
        { title: "الوحدة الثانية: قيم إنسانية (العفو مأمول - كعب بن زهير)" },
        { title: "النحو: إعمال اسم الفاعل وصيغ المبالغة" },
        { title: "الأدب: عصر صدر الإسلام (الشعر والنثر)" },
        { title: "البلاغة: الاستعارة المكنية والتصريحية" },
        { title: "الوحدة الثالثة: هويتنا (من أجل حياة كريمة - نثر)" }
      ],
      term2: [
        { title: "الوحدة الأولى: العمل والاجتهاد (العمل حياة)" },
        { title: "النصوص: البيت وطن (ابن الرومي)" },
        { title: "النحو: أسلوب الاستثناء (إلا - غير - سوى - خلا - عدا - حاشا)" },
        { title: "الأدب: العصر العباسي (سماته وخصائصه)" },
        { title: "البلاغة: الكناية (أنواعها وسر جمالها)" },
        { title: "الوحدة الثانية: تراثنا (مصر مطلع البدور)" },
        { title: "النحو: الاسم المقصور والمنقوص والممدود (تثنيته وجمعه)" },
        { title: "الأدب: نهضة الشعر في العصر الحديث" },
        { title: "البلاغة: المجاز المرسل (علاقاته)" },
        { title: "النحو: الملحقات (بالمثنى - بجمع المذكر - بجمع المؤنث)" }
      ]
    },
    [Subject.INTEGRATED_SCIENCES]: {
      term1: [
        { title: "الفصل الأول: النظام البيئي المائي" },
        { title: "الدرس 1: خصائص الماء الفيزيائية والكيميائية وتأثيرها على الحياة" },
        { title: "الدرس 2: دورة الماء والتوازن البيئي المائي" },
        { title: "الفصل الثاني: الغلاف الجوي" },
        { title: "الدرس 1: طبقات الغلاف الجوي وأهمية كل طبقة" },
        { title: "الدرس 2: ملوثات الهواء وتغير المناخ (الاحتباس الحراري)" },
        { title: "الفصل الثالث: التربة والثروة الزراعية" },
        { title: "الدرس 1: مكونات التربة وخواصها الفيزيائية والكيميائية" },
        { title: "الدرس 2: استصلاح الأراضي والأسمدة وتأثيرها" }
      ],
      term2: [
        { title: "الفصل الرابع: الطاقة ومصادرها" },
        { title: "الدرس 1: صور الطاقة وتحولاتها (الحركية، الوضع، الحرارية)" },
        { title: "الدرس 2: مصادر الطاقة المتجددة (الشمسية - الرياح - الهيدروجين الأخضر)" },
        { title: "الدرس 3: الوقود الحفري والطاقة النووية (المميزات والعيوب)" },
        { title: "الفصل الخامس: الموارد الطبيعية والتنمية المستدامة" },
        { title: "الدرس 1: المعادن والصخور الاقتصادية في مصر" },
        { title: "الدرس 2: التنوع البيولوجي وسبل حمايته" },
        { title: "الفصل السادس: التكنولوجيا الحيوية وتطبيقاتها في الحياة" }
      ]
    },
    [Subject.HISTORY]: {
      term1: [
        { title: "الوحدة الأولى: مدخل لدراسة الحضارة" },
        { title: "الدرس 1: الحضارة والتاريخ (مفاهيم أساسية)" },
        { title: "الدرس 2: مصادر دراسة الحضارات (الأولية والثانوية)" },
        { title: "الدرس 3: عوامل قيام الحضارات العالمية" },
        { title: "الوحدة الثانية: حضارة مصر القديمة (الفرعونية)" },
        { title: "الدرس 1: ملامح من تاريخ مصر القديمة (عصور القوة والضعف)" },
        { title: "الدرس 2: الحياة الاقتصادية (زراعة - صناعة - تجارة)" },
        { title: "الدرس 3: الحياة السياسية والإدارية" },
        { title: "الدرس 4: الحياة الاجتماعية وطبقات المجتمع" },
        { title: "الدرس 5: الحياة الدينية والمعتقدات" },
        { title: "الدرس 6: الحياة الثقافية والفكرية (الكتابة - العلوم - الفنون)" }
      ],
      term2: [
        { title: "الوحدة الثالثة: حضارات الشرق الأدنى القديم" },
        { title: "الدرس 1: حضارة بلاد العراق القديم (السومرية - البابلية - الآشورية)" },
        { title: "الدرس 2: حضارة فينيقيا (مدنها ومظاهرها)" },
        { title: "الوحدة الرابعة: حضارة اليونان وحضارة الرومان" },
        { title: "الدرس 1: الحضارة الإغريقية (اليونانية) - أثينا واسبرطة" },
        { title: "الدرس 2: مصر تحت حكم البطالمة (دولة البطالمة)" },
        { title: "الدرس 3: الحضارة الرومانية (الملكي - الجمهوري - الامبراطوري)" },
        { title: "الدرس 4: مصر تحت حكم الرومان (الأوضاع السياسية والاقتصادية)" }
      ]
    },
    [Subject.PHILOSOPHY]: {
      term1: [
        { title: "الوحدة الأولى: مبادئ التفكير الفلسفي" },
        { title: "الموضوع الأول: التفكير الإنساني (مفهومه - خصائصه - أهميته - أساليبه)" },
        { title: "الموضوع الثاني: نشأة الفلسفة وتعريفها وأهميتها للفرد والمجتمع" },
        { title: "الموضوع الثالث: خصائص التفكير الفلسفي ومهاراته (الشك - النقد - الحوار - التسامح - التحليل والتركيب)" }
      ],
      term2: [
        { title: "الوحدة الثانية: مبادئ التفكير العلمي" },
        { title: "الموضوع الأول: معنى العلم وأخلاقيات العالم" },
        { title: "الموضوع الثاني: خصائص التفكير العلمي وخطواته (الشعور بالمشكلة - الفروض - الاختبار)" },
        { title: "الموضوع الثالث: التفكير الناقد (مهاراته ومكوناته)" },
        { title: "الموضوع الرابع: التفكير الإبداعي (مراحله ومهاراته)" }
      ]
    },
    [Subject.ENGLISH]: {
        term1: [
            { title: "Unit 1: Getting away (Ecotourism & Past Simple/Continuous)" },
            { title: "Unit 2: Supporting the community (Volunteering & Present Perfect)" },
            { title: "Unit 3: Improving lives (Future forms)" },
            { title: "Revision 1 (Units 1-3)" },
            { title: "Unit 4: Making new friends (Advice & Suggestions)" },
            { title: "Unit 5: Communication (Technology & Future continuous)" },
            { title: "Unit 6: Learning from literature (Verbs followed by -ing/to)" },
            { title: "Reader: Treasure Island (Chapters 1-6)" }
        ],
        term2: [
            { title: "Unit 7: Health and Safety (CPR & Hygiene - Modals of necessity)" },
            { title: "Unit 8: Robots and AI (Future Perfect)" },
            { title: "Unit 9: A good education (Past Perfect)" },
            { title: "Revision 2 (Units 7-9)" },
            { title: "Unit 10: What's your job? (Reported Speech - Statements)" },
            { title: "Unit 11: The amazing world of transport (Reported Speech - Questions)" },
            { title: "Unit 12: Achievements (Reported Speech - Orders)" },
            { title: "Reader: Treasure Island (Chapters 7-12)" }
        ]
    },
    [Subject.FRENCH]: {
        term1: [
            { title: "Unité 1 / Leçon 1: Se présenter (تقديم النفس والألوان والأعداد)" },
            { title: "Unité 1 / Leçon 2: Présenter ses copains (تأنيث وجمع الصفات)" },
            { title: "Unité 1 / Leçon 3: Parler du caractère (السمات الشخصية)" },
            { title: "Unité 2 / Leçon 1: Identifier des objets (أدوات النكرة والمعرفة)" },
            { title: "Unité 2 / Leçon 2: Dire l'âge et la date (الأعداد الكبيرة والشهور)" },
            { title: "Unité 2 / Leçon 3: Exprimer ses goûts (أفعال الميول)" }
        ],
        term2: [
            { title: "Unité 3 / Leçon 1: Décrire mon lycée (مكونات المدرسة والاستفهام)" },
            { title: "Unité 3 / Leçon 2: Identifier les objets de la classe (النفي)" },
            { title: "Unité 3 / Leçon 3: Demander et dire l'heure (الساعة والجدول الدراسي)" },
            { title: "Unité 4 / Leçon 1: Décrire des personnes (الوصف الجسدي)" },
            { title: "Unité 4 / Leçon 2: Présenter sa famille (صفات الملكية)" },
            { title: "Unité 4 / Leçon 3: Parler des activités (الأنشطة ووقت الفراغ)" }
        ]
    },
    [Subject.GERMAN]: {
        term1: [
            { title: "Lektion 1: Guten Tag! (التحيات - الحروف الهجائية - الضمائر)" },
            { title: "Lektion 2: Meine Familie (أفراد العائلة - الأرقام 0-20 - أدوات المعرفة)" },
            { title: "Grammatik: Konjugation der Verben (تصريف الأفعال الضعيفة والقوية)" },
            { title: "Grammatik: W-Fragen und Ja/Nein Fragen (تكوين السؤال)" }
        ],
        term2: [
            { title: "Lektion 3: Essen und Trinken (المأكولات والمشروبات - الأسعار)" },
            { title: "Lektion 4: Meine Wohnung (السكن - الغرف - الأثاث)" },
            { title: "Grammatik: Der Akkusativ (حالة النصب)" },
            { title: "Grammatik: Verben haben/sein (أفعال الملكية والكينونة في المضارع)" },
            { title: "Grammatik: Die Negation (nicht / kein) (النفي)" }
        ]
    },
    [Subject.RELIGION]: {
        term1: [{ title: "الوحدة الأولى: الإيمان والعقيدة" }, { title: "الوحدة الثانية: القيم والآداب الاجتماعية" }, { title: "شخصيات إسلامية: أبو بكر الصديق" }],
        term2: [{ title: "الوحدة الثالثة: الإسلام وقبول الآخر" }, { title: "الوحدة الرابعة: المعاملات المالية في الإسلام" }, { title: "شخصيات: السيدة عائشة" }]
    },
    [Subject.NATIONAL_EDUCATION]: {
       term1: [{ title: "الفصل الأول: شخصية مصر تراث وتاريخ" }, { title: "الفصل الثاني: المواطنة حقوق وواجبات" }],
       term2: [{ title: "الفصل الثالث: الشباب وتحقيق التنمية" }, { title: "الفصل الرابع: قضايا وتحديات المجتمع المصري" }]
    }
  },
  // ... يمكنك إضافة بقية الصفوف بنفس الطريقة ...
  [GradeLevel.GRADE_11]: {
    // ...
  },
  [GradeLevel.GRADE_12]: {
    // ...
  }
};

// تم تحديث هذه الدالة لتتوافق مع الهيكل الجديد
export const getCurriculumFor = (grade: GradeLevel, subject: Subject): CurriculumSplit => {
  const gradeData = CURRICULUM_DATA[grade];
  if (!gradeData || !gradeData[subject]) {
      console.warn(`Missing curriculum for ${grade} - ${subject}`);
      return { term1: [], term2: [] };
  }
  // الآن يتم تحويل كل مادة إلى كائن، حتى لو لم يكن لها وصف بصري
  // هذا يضمن أن الهيكل ثابت دائمًا
  const ensureLessonObjects = (lessons: any[]): Lesson[] => 
    lessons.map(lesson => typeof lesson === 'string' ? { title: lesson } : lesson);

  return {
    term1: ensureLessonObjects(gradeData[subject].term1),
    term2: ensureLessonObjects(gradeData[subject].term2)
  };
};

// تم تحديث هذه الدالة لتقرأ العناوين من الكائنات الجديدة
export const getCurriculumStringForAI = (grade: GradeLevel, subject: Subject): string => {
    const data = getCurriculumFor(grade, subject);
    let output = "";
    
    if (data.term1.length > 0) {
        // نستخرج العناوين فقط للانضمام
        output += "الترم الأول (First Term):\n- " + data.term1.map(lesson => lesson.title).join('\n- ') + "\n";
    }
    
    if (data.term2.length > 0) {
        // نستخرج العناوين فقط للانضمام
        output += "\nالترم الثاني (Second Term):\n- " + data.term2.map(lesson => lesson.title).join('\n- ');
    } else {
        output += "\nالترم الثاني: لم تعلن الوزارة تفاصيله بعد.";
    }
    
    return output;
};
