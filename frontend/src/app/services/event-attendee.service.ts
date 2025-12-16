import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EventAttendee {
  id?: number;
  eventRegistrationId: number;
  eventRegistration?: any;
  checkInDateTime?: string;
  checkOutDateTime?: string;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CheckInDto {
  barcode: string;
}

export interface CheckOutDto {
  barcode: string;
}

export interface EventAttendeeResponse {
  statusCode: number;
  message: string;
  result: EventAttendee;
}

export interface EventAttendeeListResponse {
  statusCode: number;
  message: string;
  result: EventAttendee[];
}

@Injectable({
  providedIn: 'root',
})
export class EventAttendeeService {
  private baseUrl = `${environment.baseUrl}/EventAttendees`;

  constructor(private http: HttpClient) {}

  checkIn(barcode: string): Observable<EventAttendeeResponse> {
    return this.http.post<EventAttendeeResponse>(`${this.baseUrl}/checkin`, { barcode });
  }

  checkOut(barcode: string): Observable<EventAttendeeResponse> {
    return this.http.post<EventAttendeeResponse>(`${this.baseUrl}/checkout`, { barcode });
  }

  getByRegistrationId(registrationId: number): Observable<EventAttendeeListResponse> {
    return this.http.get<EventAttendeeListResponse>(
      `${this.baseUrl}/registration/${registrationId}`
    );
  }
}

