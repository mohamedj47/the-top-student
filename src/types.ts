
export enum GradeLevel {
  GRADE_10 = 'الصف الأول الثانوي',
  GRADE_11 = 'الصف الثاني الثانوي',
  GRADE_12 = 'الصف الثالث الثانوي',
}

export enum Subject {
  ARABIC = 'اللغة العربية',
  ENGLISH = 'اللغة الإنجليزية',
  FRENCH = 'اللغة الفرنسية',
  GERMAN = 'اللغة الألمانية',
  INTEGRATED_SCIENCES = 'العلوم المتكاملة',
  PHYSICS = 'الفيزياء',
  CHEMISTRY = 'الكيمياء',
  BIOLOGY = 'الأحياء',
  MATH = 'الرياضيات',
  HISTORY = 'التاريخ',
  GEOGRAPHY = 'الجغرافيا',
  PHILOSOPHY = 'الفلسفة والمنطق',
  PSYCHOLOGY = 'علم النفس والاجتماع',
  GEOLOGY = 'الجيولوجيا',
  RELIGION = 'التربية الدينية',
  NATIONAL_EDUCATION = 'التربية الوطنية',
}

export enum Sender {
  USER = 'user',
  BOT = 'model',
}

export interface Attachment {
  type: 'image' | 'audio' | 'file';
  mimeType: string;
  data: string; // Base64 string
  name?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  isStreaming?: boolean;
  attachment?: Attachment;
  simplifiedText?: string;
  visualDescription?: string;
}

export interface PerformanceMetrics {
  accuracy: number;        // من 0 لـ 100
  comprehension: number;   // من 0 لـ 100
  analyticalSkills: number; // من 0 لـ 100
  consistency: number;     // من 0 لـ 100
  overallLevel: string;    // مبتدئ، متوسط، متقدم، عبقري
  recommendations: string[];
  weakPoints: string[];
  strongPoints: string[];
}

export interface SubjectMastery {
  subject: Subject;
  masteryScore: number;
  lastEvaluated: Date;
  metrics: PerformanceMetrics;
}

export interface ChatSession {
  grade: GradeLevel;
  subject: Subject;
}

export interface GenerationOptions {
  useThinking?: boolean;
  useSearch?: boolean;
}
