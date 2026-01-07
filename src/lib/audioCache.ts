
export class AudioCache {
  private static DB_NAME = 'SmartEdu_AudioCache';
  private static STORE_NAME = 'audio_blobs';

  private static async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1); 
      request.onupgradeneeded = () => request.result.createObjectStore(this.STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async save(key: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(this.STORE_NAME, 'readwrite');
    tx.objectStore(this.STORE_NAME).put(blob, key);
  }

  static async get(key: string): Promise<Blob | null> {
    const db = await this.getDB();
    const tx = db.transaction(this.STORE_NAME, 'readonly');
    const request = tx.objectStore(this.STORE_NAME).get(key);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  static generateKey(text: string): string {
    return btoa(unescape(encodeURIComponent(text.substring(0, 50))));
  }
}
