
import { Subject, GradeLevel, StudyLanguage } from '../types';

export interface StaticContent {
  topic: string;
  subject: Subject;
  grade: GradeLevel;
  language: StudyLanguage;
  explanation: string;
  summary: string;
  practice: string;
  keyPoints: string;
}

/**
 * المستودع المعرفي الذهبي الشامل (Global Offline Repository)
 * يحتوي على ملخصات الدروس الأساسية لجميع اللغات والصفوف لضمان العمل بدون إنترنت
 */
export const localContentRepository: StaticContent[] = [
  // ================= ENGLISH (Language Schools) =================
  {
    topic: "Organic Chemistry",
    subject: Subject.CHEMISTRY,
    grade: GradeLevel.GRADE_12,
    language: StudyLanguage.ENGLISH,
    explanation: `### Organic Chemistry: Alkanes, Alkenes, and Alkynes
- **Alkanes (CnH2n+2):** Saturated hydrocarbons, single bonds only. (e.g., Methane CH4).
- **Alkenes (CnH2n):** Unsaturated, at least one double bond. (e.g., Ethene C2H4).
- **Alkynes (CnH2n-2):** Unsaturated, at least one triple bond. (e.g., Ethyne C2H2).`,
    summary: `Identify by bonds: Single = -ane, Double = -ene, Triple = -yne.`,
    practice: `Formula for Propane? (C3H8).`,
    keyPoints: "Carbon always forms 4 bonds."
  },
  {
    topic: "Ohm's Law",
    subject: Subject.PHYSICS,
    grade: GradeLevel.GRADE_12,
    language: StudyLanguage.ENGLISH,
    explanation: `### Ohm's Law & Electric Circuits
**Formula:** V = I × R
- **V (Voltage):** Measured in Volts (V).
- **I (Current):** Measured in Amperes (A).
- **R (Resistance):** Measured in Ohms (Ω).`,
    summary: `V = IR. To increase current, increase voltage or decrease resistance.`,
    practice: `If V=10V and R=2Ω, I = ? (Ans: 5A).`,
    keyPoints: "Ohmic conductors have constant resistance at constant temperature."
  },
  {
    topic: "DNA Structure",
    subject: Subject.BIOLOGY,
    grade: GradeLevel.GRADE_12,
    language: StudyLanguage.ENGLISH,
    explanation: `### DNA: The Genetic Material
DNA consists of two strands forming a double helix.
- **Nucleotides:** Sugar, Phosphate, and a Nitrogenous Base.
- **Base Pairs:** Adenine (A) pairs with Thymine (T), Guanine (G) pairs with Cytosine (C).`,
    summary: `A=T (2 bonds), G≡C (3 bonds).`,
    practice: `If Adenine is 20%, what is Cytosine? (Ans: 30%).`,
    keyPoints: "DNA replication is semi-conservative."
  },

  // ================= FRENCH (Écoles de Langues) =================
  {
    topic: "Chimie Organique",
    subject: Subject.CHEMISTRY,
    grade: GradeLevel.GRADE_12,
    language: StudyLanguage.FRENCH,
    explanation: `### Chimie Organique: Alcanes, Alcènes et Alcynes
- **Alcanes (CnH2n+2):** Hydrocarbures saturés (ex: Méthane CH4).
- **Alcènes (CnH2n):** Insaturés avec double liaison (ex: Éthène C2H4).
- **Alcynes (CnH2n-2):** Insaturés avec triple liaison.`,
    summary: `Alcane = Simple, Alcène = Double, Alcyne = Triple.`,
    practice: `Formule du Butane? (C4H10).`,
    keyPoints: "Le carbone est tétravalent."
  },

  // ================= GERMAN (Sprachschulen) =================
  {
    topic: "Ohmsches Gesetz",
    subject: Subject.PHYSICS,
    grade: GradeLevel.GRADE_12,
    language: StudyLanguage.GERMAN,
    explanation: `### Ohmsches Gesetz (U = R * I)
- **U:** Elektrische Spannung (Volt).
- **I:** Elektrische Stromstärke (Ampere).
- **R:** Elektrischer Widerstand (Ohm).`,
    summary: `U = R * I ist die Grundformel der Elektrotechnik.`,
    practice: `U=12V, R=4 Ohm -> I=? (Antwort: 3A).`,
    keyPoints: "Widerstand ist Materialabhängig."
  },

  // ================= ARABIC (المحتوى العربي الأصلي) =================
  {
    topic: "الكيمياء العضوية",
    subject: Subject.CHEMISTRY,
    grade: GradeLevel.GRADE_12,
    language: StudyLanguage.ARABIC,
    explanation: `### الكيمياء العضوية: الألكانات والألكينات والألكاينات
- **الألكانات (CnH2n+2):** هيدروكربونات مشبعة، روابط أحادية فقط (مثل الميثان CH4).
- **الألكينات (CnH2n):** غير مشبعة، تحتوي على رابطة مزدوجة (مثل الإيثين C2H4).
- **الألكاينات (CnH2n-2):** غير مشبعة، تحتوي على رابطة ثلاثية (مثل الإيثاين C2H2).`,
    summary: `أحادية = ألكان، ثنائية = ألكين، ثلاثية = ألكاين.`,
    practice: `ما هي صيغة البروبان؟ (C3H8).`,
    keyPoints: "ذرة الكربون رباعية التكافؤ دائماً."
  },
  {
    topic: "قانون أوم",
    subject: Subject.PHYSICS,
    grade: GradeLevel.GRADE_12,
    language: StudyLanguage.ARABIC,
    explanation: `### قانون أوم والدوائر الكهربائية
**الصيغة:** V = I × R
- **V (فرق الجهد):** بالفولت.
- **I (شدة التيار):** بالأمبير.
- **R (المقاومة):** بالأوم.`,
    summary: `العلاقة طردية بين الجهد والتيار عند ثبوت المقاومة.`,
    practice: `إذا كان الجهد 20 فولت والمقاومة 5 أوم، احسب التيار. (الإجابة: 4 أمبير).`,
    keyPoints: "تزداد المقاومة بزيادة طول السلك ونقص مساحة مقطعه."
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
1. ابدأ يومك بالفجر.
2. استخدم تقنية البومودورو.
3. لخص كل درس في خريطة ذهنية.`
  }
];
