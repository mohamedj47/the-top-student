
export class AudioCache {
  private static DB_NAME = 'SmartEdu_AudioCache';
  private static STORE_NAME = 'audio_blobs';
  private static DB_VERSION = 1;

  private static async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  static async save(key: string, base64Data: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).put(base64Data, key);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn("Could not save to audio cache", e);
    }
  }

  static async get(key: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const request = tx.objectStore(this.STORE_NAME).get(key);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return null;
    }
  }

  // توليد مفتاح فريد بناءً على النص
  static generateKey(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `audio_${hash}`;
  }
}
