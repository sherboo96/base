import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EventSpeaker {
  id?: number;
  name: string;
  nameAr?: string;
  bioEn?: string;
  bioAr?: string;
  from?: string;
  eventId: number;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Location {
  id?: number;
  name: string;
  nameAr: string;
  floor?: string;
  building?: string;
  category: number;
  organizationId: number;
  logo?: string;
  template?: string;
}

export interface Event {
  id?: number;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  code: string;
  poster?: string;
  badge?: string; // Path to badge template file
  agenda?: string; // Path to agenda PDF file
  date?: string; // Event date (ISO string format)
  published: boolean;
  locationId?: number;
  location?: Location;
  speakerIds?: number[];
  speakers?: EventSpeaker[];
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EventResponse {
  statusCode: number;
  message: string;
  result: Event;
  total?: number;
  pagination?: any;
}

export interface EventListResponse {
  statusCode: number;
  message: string;
  result: Event[];
  total?: number;
  pagination?: any;
}

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private baseUrl = `${environment.baseUrl}/Events`;

  constructor(private http: HttpClient) {}

  // Public endpoint - no authentication required
  getByCode(code: string): Observable<EventResponse> {
    return this.http.get<EventResponse>(`${this.baseUrl}/public/${code}`);
  }

  getAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    published?: boolean
  ): Observable<EventListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (published !== undefined) {
      params = params.set('published', published.toString());
    }

    return this.http.get<EventListResponse>(this.baseUrl, { params });
  }

  getById(id: number): Observable<EventResponse> {
    return this.http.get<EventResponse>(`${this.baseUrl}/${id}`);
  }

  create(event: Event): Observable<EventResponse> {
    return this.http.post<EventResponse>(this.baseUrl, event);
  }

  update(id: number, event: Event): Observable<EventResponse> {
    return this.http.put<EventResponse>(`${this.baseUrl}/${id}`, event);
  }

  delete(id: number): Observable<{ statusCode: number; message: string; result: boolean }> {
    return this.http.delete<{ statusCode: number; message: string; result: boolean }>(
      `${this.baseUrl}/${id}`
    );
  }
}

