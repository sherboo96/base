import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export enum EventRegistrationStatus {
  Draft = 0,
  Approved = 1,
  Rejected = 2
}

export interface EventRegistration {
  id?: number;
  name: string;
  nameAr?: string;
  phone: string;
  email: string;
  jobTitle?: string;
  barcode?: string;
  seatNumber?: string;
  status?: EventRegistrationStatus;
  emailSent?: boolean;
  emailSentAt?: string;
  registrationSuccessfulEmailSent?: boolean;
  registrationSuccessfulEmailSentAt?: string;
  confirmationEmailSent?: boolean;
  confirmationEmailSentAt?: string;
  finalApprovalEmailSent?: boolean;
  finalApprovalEmailSentAt?: string;
  eventId: number;
  event?: any;
  eventOrganizationId?: number;
  eventOrganization?: any;
  otherOrganization?: string;
  attendees?: EventAttendee[];
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EventAttendee {
  id?: number;
  eventRegistrationId: number;
  eventRegistration?: EventRegistration;
  checkInDateTime?: string;
  checkOutDateTime?: string;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EventRegistrationResponse {
  statusCode: number;
  message: string;
  result: EventRegistration;
  total?: number;
  pagination?: any;
}

export interface EventRegistrationListResponse {
  statusCode: number;
  message: string;
  result: EventRegistration[];
  total?: number;
  pagination?: any;
}

@Injectable({
  providedIn: 'root',
})
export class EventRegistrationService {
  private baseUrl = `${environment.baseUrl}/EventRegistrations`;

  constructor(private http: HttpClient) {}

  // Public endpoint - no authentication required
  createPublic(registration: EventRegistration): Observable<EventRegistrationResponse> {
    return this.http.post<EventRegistrationResponse>(`${this.baseUrl}/public`, registration);
  }

  getAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    eventId?: number
  ): Observable<EventRegistrationListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (eventId) {
      params = params.set('eventId', eventId.toString());
    }

    return this.http.get<EventRegistrationListResponse>(this.baseUrl, { params });
  }

  getById(id: number): Observable<EventRegistrationResponse> {
    return this.http.get<EventRegistrationResponse>(`${this.baseUrl}/${id}`);
  }

  delete(id: number): Observable<{ statusCode: number; message: string; result: boolean }> {
    return this.http.delete<{ statusCode: number; message: string; result: boolean }>(
      `${this.baseUrl}/${id}`
    );
  }

  // Get badge image by registration ID
  getBadgeById(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/badge`, { responseType: 'blob' });
  }

  // Get badge image by barcode (public endpoint)
  getBadgeByBarcode(barcode: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/badge/${barcode}`, { responseType: 'blob' });
  }

  // Approve registration
  approve(id: number): Observable<EventRegistrationResponse> {
    return this.http.post<EventRegistrationResponse>(
      `${this.baseUrl}/${id}/approve`,
      {}
    );
  }

  // Reject registration
  reject(id: number): Observable<EventRegistrationResponse> {
    return this.http.post<EventRegistrationResponse>(
      `${this.baseUrl}/${id}/reject`,
      {}
    );
  }

  // Resend confirmation email
  resendEmail(id: number): Observable<EventRegistrationResponse> {
    return this.http.post<EventRegistrationResponse>(
      `${this.baseUrl}/${id}/resend-email`,
      {}
    );
  }

  // Send final approval email with badge and agenda
  sendFinalApproval(id: number): Observable<EventRegistrationResponse> {
    return this.http.post<EventRegistrationResponse>(
      `${this.baseUrl}/${id}/send-final-approval`,
      {}
    );
  }

  // Update seat number
  updateSeatNumber(id: number, seatNumber: string | null): Observable<EventRegistrationResponse> {
    return this.http.put<EventRegistrationResponse>(
      `${this.baseUrl}/${id}/seat-number`,
      { seatNumber }
    );
  }

  // Export registrations to Excel (CSV)
  exportToExcel(
    eventId?: number,
    search?: string,
    status?: EventRegistrationStatus
  ): Observable<Blob> {
    let params = new HttpParams();
    
    if (eventId) {
      params = params.set('eventId', eventId.toString());
    }
    if (search) {
      params = params.set('search', search);
    }
    if (status !== undefined) {
      params = params.set('status', status.toString());
    }

    return this.http.get(`${this.baseUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }
}

