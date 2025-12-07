import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  statusCode: number;
  message: string;
  result: string; // File path
}

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(`${this.baseUrl}/Attachments/upload`, formData).pipe(
      map(response => response.result)
    );
  }

  deleteFile(filePath: string): Observable<boolean> {
    return this.http.delete<{ statusCode: number; message: string; result: boolean }>(
      `${this.baseUrl}/Attachments/delete`,
      { params: { filePath } }
    ).pipe(
      map(response => response.result)
    );
  }

  getFileUrl(filePath: string): string {
    if (!filePath) return '';
    // If filePath already starts with http, return as is
    if (filePath.startsWith('http')) {
      return filePath;
    }
    // Static files are served at root level, not under /api
    // Extract base URL without /api
    const baseUrlWithoutApi = this.baseUrl.replace('/api', '');
    // If filePath starts with /, use it directly
    if (filePath.startsWith('/')) {
      return `${baseUrlWithoutApi}${filePath}`;
    }
    // Otherwise, prepend with /
    return `${baseUrlWithoutApi}/${filePath}`;
  }
}
