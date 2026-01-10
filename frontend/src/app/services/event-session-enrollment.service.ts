import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EventSessionEnrollment {
  id?: number;
  name: string;
  nameAr?: string;
  phone: string;
  email?: string;
  barcode?: string;
  eventSessionId: number;
  eventSession?: {
    id?: number;
    title: string;
    titleAr?: string;
    dateTime: string;
    availableSeats: number;
  };
  eventOrganizationId?: number;
  eventOrganization?: {
    id?: number;
    name: string;
    nameAr?: string;
  };
  otherOrganization?: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
  isCheckedIn?: boolean;
  checkedInAt?: string;
  approvalEmailSent?: boolean;
  approvalEmailSentAt?: string;
  createdAt?: string;
}

export interface EventSessionEnrollmentResponse {
  statusCode: number;
  message: string;
  result: EventSessionEnrollment;
  total?: number;
  pagination?: any;
}

export interface EventSessionEnrollmentsResponse {
  statusCode: number;
  message: string;
  result: EventSessionEnrollment[];
  total?: number;
  pagination?: any;
}

export interface SessionInfoResponse {
  statusCode: number;
  message: string;
  result: {
    id: number;
    title: string;
    titleAr?: string;
    description?: string;
    descriptionAr?: string;
    dateTime: string;
    banner?: string;
    availableSeats: number;
    totalSeats: number;
    eventId: number;
    eventName?: string;
    eventNameAr?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class EventSessionEnrollmentService {
  private apiUrl = `${environment.baseUrl}/EventSessionEnrollments`;

  constructor(private http: HttpClient) {}

  // Public endpoint - no authentication required
  createPublic(sessionId: number, enrollment: EventSessionEnrollment): Observable<EventSessionEnrollmentResponse> {
    return this.http.post<EventSessionEnrollmentResponse>(`${this.apiUrl}/public/${sessionId}`, enrollment);
  }

  // Public endpoint - get session info
  getSessionInfo(sessionId: number): Observable<SessionInfoResponse> {
    return this.http.get<SessionInfoResponse>(`${this.apiUrl}/public/session/${sessionId}`);
  }

  // Get QR code image
  getQRCode(barcode: string): string {
    return `${this.apiUrl}/qr/${barcode}`;
  }

  // Admin endpoints
  getAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    sessionId?: number
  ): Observable<EventSessionEnrollmentsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (sessionId) {
      params = params.set('sessionId', sessionId.toString());
    }

    return this.http.get<EventSessionEnrollmentsResponse>(this.apiUrl, { params });
  }

  getById(id: number): Observable<EventSessionEnrollmentResponse> {
    return this.http.get<EventSessionEnrollmentResponse>(`${this.apiUrl}/${id}`);
  }

  checkIn(id: number): Observable<EventSessionEnrollmentResponse> {
    return this.http.post<EventSessionEnrollmentResponse>(`${this.apiUrl}/${id}/check-in`, {});
  }

  approve(id: number): Observable<EventSessionEnrollmentResponse> {
    return this.http.post<EventSessionEnrollmentResponse>(`${this.apiUrl}/${id}/approve`, {});
  }

  delete(id: number): Observable<EventSessionEnrollmentResponse> {
    return this.http.delete<EventSessionEnrollmentResponse>(`${this.apiUrl}/${id}`);
  }
}

