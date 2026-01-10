import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EventSession {
  id?: number;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  availableSeats: number;
  dateTime: string; // ISO string format
  banner?: string;
  eventId: number;
  event?: {
    id?: number;
    name: string;
    nameAr?: string;
    code: string;
  };
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EventSessionResponse {
  statusCode: number;
  message: string;
  result: EventSession;
  total?: number;
  pagination?: any;
}

export interface EventSessionsResponse {
  statusCode: number;
  message: string;
  result: EventSession[];
  total?: number;
  pagination?: any;
}

@Injectable({
  providedIn: 'root',
})
export class EventSessionService {
  private apiUrl = `${environment.baseUrl}/EventSessions`;

  constructor(private http: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    eventId?: number
  ): Observable<EventSessionsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (eventId) {
      params = params.set('eventId', eventId.toString());
    }

    return this.http.get<EventSessionsResponse>(this.apiUrl, { params });
  }

  getById(id: number): Observable<EventSessionResponse> {
    return this.http.get<EventSessionResponse>(`${this.apiUrl}/${id}`);
  }

  create(session: EventSession): Observable<EventSessionResponse> {
    return this.http.post<EventSessionResponse>(this.apiUrl, session);
  }

  update(id: number, session: EventSession): Observable<EventSessionResponse> {
    return this.http.put<EventSessionResponse>(`${this.apiUrl}/${id}`, session);
  }

  delete(id: number): Observable<EventSessionResponse> {
    return this.http.delete<EventSessionResponse>(`${this.apiUrl}/${id}`);
  }

  uploadBanner(id: number, file: File): Observable<EventSessionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<EventSessionResponse>(
      `${this.apiUrl}/${id}/upload-banner`,
      formData
    );
  }
}

