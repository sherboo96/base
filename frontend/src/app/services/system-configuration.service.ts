import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SystemConfiguration {
  key: string;
  value: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SystemConfigurationService {
  private baseUrl = `${environment.baseUrl}/SystemConfigurations`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  getByKey(key: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${key}`);
  }

  update(key: string, configuration: SystemConfiguration): Observable<any> {
    return this.http.put(`${this.baseUrl}/${key}`, configuration);
  }

  create(configuration: SystemConfiguration): Observable<any> {
    return this.http.post(this.baseUrl, configuration);
  }
}
