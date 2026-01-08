import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Public {
  key: string;
  value: string;
  description?: string;
}

export interface SupportContact {
  name: string;
  email: string;
  phoneNumber: string;
}

export interface SupportInfo {
  contacts: SupportContact[];
  // Legacy properties for backward compatibility
  emails?: string[];
  phoneNumbers?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class PublicService {
  private baseUrl = `${environment.baseUrl}/Public`;

  constructor(private http: HttpClient) {}

  getSupportInfo(): Observable<any> {
    return this.http.get(`${this.baseUrl}/support`);
  }

  getAll(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  getByKey(key: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${key}`);
  }

  createOrUpdate(publicData: Public): Observable<any> {
    return this.http.post(this.baseUrl, publicData);
  }

  updateSupportInfo(supportInfo: SupportInfo): Observable<any> {
    return this.http.post(`${this.baseUrl}/support`, supportInfo);
  }

  delete(key: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${key}`);
  }
}

