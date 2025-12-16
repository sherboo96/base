import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Log {
  id: number;
  level: string;
  message: string;
  exception?: string;
  stackTrace?: string;
  source?: string;
  action?: string;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  requestPath?: string;
  requestMethod?: string;
  requestQueryString?: string;
  statusCode?: number;
  machineName?: string;
  environment?: string;
  timestamp: string;
  createdOn: string;
}

@Injectable({
  providedIn: 'root',
})
export class LogService {
  private baseUrl = `${environment.baseUrl}/Logs`;

  constructor(private http: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 50,
    search?: string,
    level?: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (level) {
      params = params.set('level', level);
    }
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get(this.baseUrl, { params });
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  getLevels(): Observable<any> {
    return this.http.get(`${this.baseUrl}/levels`);
  }

  getLoggingStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/status`);
  }

  toggleLogging(enabled: boolean): Observable<any> {
    return this.http.post(`${this.baseUrl}/toggle`, enabled);
  }

  deleteLogs(
    search?: string,
    level?: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<any> {
    let params = new HttpParams();

    if (search) {
      params = params.set('search', search);
    }
    if (level) {
      params = params.set('level', level);
    }
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.delete(this.baseUrl, { params });
  }
}

