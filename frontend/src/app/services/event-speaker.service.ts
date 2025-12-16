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

export interface EventSpeakerResponse {
  statusCode: number;
  message: string;
  result: EventSpeaker;
  total?: number;
  pagination?: any;
}

export interface EventSpeakerListResponse {
  statusCode: number;
  message: string;
  result: EventSpeaker[];
  total?: number;
  pagination?: any;
}

@Injectable({
  providedIn: 'root',
})
export class EventSpeakerService {
  private baseUrl = `${environment.baseUrl}/EventSpeakers`;

  constructor(private http: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    eventId?: number
  ): Observable<EventSpeakerListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (eventId) {
      params = params.set('eventId', eventId.toString());
    }

    return this.http.get<EventSpeakerListResponse>(this.baseUrl, { params });
  }

  getById(id: number): Observable<EventSpeakerResponse> {
    return this.http.get<EventSpeakerResponse>(`${this.baseUrl}/${id}`);
  }

  create(speaker: EventSpeaker): Observable<EventSpeakerResponse> {
    return this.http.post<EventSpeakerResponse>(this.baseUrl, speaker);
  }

  update(id: number, speaker: EventSpeaker): Observable<EventSpeakerResponse> {
    return this.http.put<EventSpeakerResponse>(`${this.baseUrl}/${id}`, speaker);
  }

  delete(id: number): Observable<{ statusCode: number; message: string; result: boolean }> {
    return this.http.delete<{ statusCode: number; message: string; result: boolean }>(
      `${this.baseUrl}/${id}`
    );
  }
}

