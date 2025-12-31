
import { Subject, GradeLevel } from '../types';

export interface StaticContent {
  topic: string;
  subject: Subject;
  grade: GradeLevel;
  explanation: string;
  summary: string;
  practice: string;
  keyPoints: string;
}

/**
 * المستودع المعرفي الذهبي (Offline Encyclopedia)
 * يحتوي على جوهر المناهج لجميع المواد لضمان عدم توقف الطالب
 */
export const localContentRepository: StaticContent[] = [
  // --- اللغة الإنجليزية ---
  {
    topic: "Unit 1: Getting away",
    subject: Subject.ENGLISH,
    grade: GradeLevel.GRADE_10,
    explanation: `### Unit 1: Ecotourism (English)
| Word | Meaning |
| :--- | :--- |
| **Ecotourism** | السياحة البيئية |
| **Sustainable** | مستدام / صديق للبيئة |
| **Endangered** | مهدد بالانقراض |
| **Impact** | تأثير |

**Grammar (الماضي البسيط والمستمر):**
- **Past Simple:** حدث انتهى (I played).
- **Past Continuous:** حدث كان مستمراً (I was playing).`,
    summary: `استخدم While مع الماضي المستمر و When مع الماضي البسيط في الغالب.`,
    practice: `While I (read / was reading), the phone rang.`,
    keyPoints: "السياحة البيئية تحمي الطبيعة والسكان المحليين."
  },
  // --- اللغة العربية ---
  {
    topic: "كان وأخواتها",
    subject: Subject.ARABIC,
    grade: GradeLevel.GRADE_10,
    explanation: `### الأفعال الناقصة والتامة
| الفعل | عمله | مثال |
| :--- | :--- | :--- |
| **كان** | ترفع المبتدأ وتنصب الخبر | كان الجوُّ بارداً |
| **أصبح** | التوقيت بالصباح | أصبح الطالبُ نشيطاً |
| **ليس** | النفي | ليس الامتحانُ صعباً |

**القاعدة التامة:** إذا اكتفت كان بفاعلها فهي تامة (فسبحان الله حين تمسون).`,
    summary: `أفعال الاستمرار (ما زال، ما برح..) لابد أن تسبق بنفي.`,
    practice: `أعرب: "أصبح الصبحُ". (الصبح: فاعل لأن أصبح هنا تامة).`,
    keyPoints: "الناقصة تحتاج لخبر، والتامة تكتفي بفاعلها."
  },
  // --- الفيزياء ---
  {
    topic: "قانون أوم",
    subject: Subject.PHYSICS,
    grade: GradeLevel.GRADE_12,
    explanation: `### قانون أوم وقانونا كيرشوف
| القانون | الصيغة الرياضية | الاستخدام |
| :--- | :--- | :--- |
| **أوم** | V = I * R | حساب الجهد والتيار |
| **كيرشوف 1** | ΣI in = ΣI out | حفظ الشحنة (نقطة تفرع) |
| **كيرشوف 2** | ΣV = ΣIR | حفظ الطاقة (مسار مغلق) |`,
    summary: `المقاومة النوعية تتوقف فقط على نوع المادة ودرجة الحرارة.`,
    practice: `سلك طوله زاد للضعف، ماذا يحدث لمقاومته؟ (تزداد للأربعة أمثال إذا قل القطر للنصف).`,
    keyPoints: "التيار يختار دائماً الطريق الأقل مقاومة."
  },
  // --- التربية الدينية ---
  {
    topic: "الإيمان والعقيدة",
    subject: Subject.RELIGION,
    grade: GradeLevel.GRADE_10,
    explanation: `### أركان الإيمان
1. الإيمان بالله.
2. ملائكته.
3. كتبه.
4. رسله.
5. اليوم الآخر.
6. القدر خيره وشره.`,
    summary: `الإيمان قول باللسان وتصديق بالقلب وعمل بالجوارح.`,
    practice: `ما الفرق بين النبي والرسول؟`,
    keyPoints: "العقيدة هي أصل الدين وأساس العمل."
  },
  // --- الرياضيات ---
  {
    topic: "الأعداد المركبة",
    subject: Subject.MATH,
    grade: GradeLevel.GRADE_10,
    explanation: `### مقدمة الأعداد المركبة (ت)
| المقدار | القيمة |
| :--- | :--- |
| **ت** | √-1 |
| **ت²** | -1 |
| **ت³** | -ت |
| **ت⁴** | 1 |`,
    summary: `أي (ت) مرفوعة لأس يقبل القسمة على 4 قيمتها 1.`,
    practice: `أوجد قيمة ت^25؟ الحل: ت.`,
    keyPoints: "العدد المركب يتكون من جزء حقيقي وجزء تخيلي."
  }
];

export interface StaticQuestion {
  question: string;
  answer: string;
  subject: Subject;
  grade: GradeLevel;
  difficulty: 'easy' | 'medium' | 'hard';
  readingTime: string;
}

export const questionsBank: StaticQuestion[] = [
  {
    question: "نصائح للمذاكرة",
    subject: Subject.ARABIC,
    grade: GradeLevel.GRADE_12,
    difficulty: 'easy',
    readingTime: '2 دقيقة',
    answer: `### نصائح ذهبية للتفوق:
1. ابدأ يومك بالفجر (وقت البركة).
2. استخدم تقنية البومودورو (25 دقيقة مذاكرة + 5 راحة).
3. لخص كل درس في ورقة واحدة (خريطة ذهنية).
4. اشرح ما تعلمته لزميلك أو لنفسك في المرآة.`
  }
];
