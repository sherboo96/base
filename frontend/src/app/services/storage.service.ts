import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly encryptionKey: string;
  private readonly storagePrefix = 'enc_';

  constructor() {
    // Use environment variable for encryption key
    this.encryptionKey = environment.encryptionKey || 'MOOP@ssw0rd20242025';
  }

  private encrypt(data: string): string {
    try {
      // Simple XOR encryption for demonstration
      // In production, use a more secure encryption method like AES
      let result = '';
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(
          data.charCodeAt(i) ^
            this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return btoa(result); // Base64 encode the result
    } catch (error) {
      console.error('Encryption error:', error);
      return '';
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      const decoded = atob(encryptedData);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(
          decoded.charCodeAt(i) ^
            this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return result;
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  setItem(key: string, value: any): void {
    try {
      const stringValue = JSON.stringify(value);
      const encryptedValue = this.encrypt(stringValue);

      localStorage.setItem(this.storagePrefix + key, encryptedValue);
    } catch (error) {
      console.error('Error setting encrypted item:', error);
    }
  }

  getItem<T>(key: string): T | null {
    try {
      const encryptedValue = localStorage.getItem(this.storagePrefix + key);
      if (!encryptedValue) return null;

      const decryptedValue = this.decrypt(encryptedValue);
      return JSON.parse(decryptedValue) as T;
    } catch (error) {
      console.error('Error getting encrypted item:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(this.storagePrefix + key);
    } catch (error) {
      console.error('Error removing encrypted item:', error);
    }
  }

  clear(): void {
    try {
      // Only remove encrypted items
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing encrypted storage:', error);
    }
  }
}
