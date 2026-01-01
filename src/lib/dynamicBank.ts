
import { Subject, GradeLevel } from '../types';

export const ACTIVATION_SALT = "SMART_EDU_EGYPT_2026";

export function generateActivationCode(deviceId: string): string {
  if (!deviceId) return "";
  const cleanId = deviceId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const input = cleanId + ACTIVATION_SALT;
  const base64 = btoa(input);
  return base64.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 12);
}

export interface DynamicQuestion {
  question: string;
  answer: string;
  subject: string;
  grade: string;
  timestamp: number;
  timesAsked: number;
  askedBy: string[];
}

export class DynamicQuestionBank {
  private static DB_NAME = 'SmartEdu_DynamicBank';
  private static STORE_NAME = 'questions';
  private static VERSION = 1;

  private static async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'question' });
          store.createIndex('subject', 'subject', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async getAll(): Promise<DynamicQuestion[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  static async search(query: string, subject: string): Promise<DynamicQuestion | null> {
    const normalizedQuery = query.trim().toLowerCase();
    const bank = await this.getAll();
    
    // محاولة البحث عن تطابق ذكي
    const match = bank.find(item => 
      item.subject === subject && 
      (normalizedQuery.includes(item.question.toLowerCase()) || item.question.toLowerCase().includes(normalizedQuery))
    );

    if (match) return match;

    // بحث بالكلمات المفتاحية
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 3);
    if (queryWords.length === 0) return null;

    return bank.find(item => {
      if (item.subject !== subject) return false;
      const itemWords = item.question.toLowerCase().split(/\s+/);
      const matches = queryWords.filter(word => itemWords.some(iw => iw.includes(word)));
      return matches.length >= Math.ceil(queryWords.length * 0.4);
    }) || null;
  }

  static async add(question: string, answer: string, subject: string, grade: string, deviceId: string) {
    const db = await this.getDB();
    const tx = db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    
    const request = store.get(question);
    request.onsuccess = () => {
      const existing = request.result;
      if (existing) {
        if (!existing.askedBy.includes(deviceId)) {
          existing.askedBy.push(deviceId);
          existing.timesAsked++;
          store.put(existing);
        }
      } else {
        store.put({ question, answer, subject, grade, timestamp: Date.now(), timesAsked: 1, askedBy: [deviceId] });
      }
    };
  }

  static async getStats() {
    const bank = await this.getAll();
    return { 
      totalQuestions: bank.length, 
      popularCount: bank.filter(q => q.timesAsked > 3).length 
    };
  }

  static async getPopular(limit = 8): Promise<DynamicQuestion[]> {
    const bank = await this.getAll();
    return bank.sort((a, b) => b.timesAsked - a.timesAsked).slice(0, limit);
  }
}
