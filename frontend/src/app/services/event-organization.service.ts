import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EventOrganization {
  id?: number;
  name: string;
  nameAr?: string;
  isMain?: boolean; // Only one organization can be main
  isActive?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EventOrganizationResponse {
  statusCode: number;
  message: string;
  result: EventOrganization;
  total?: number;
  pagination?: any;
}

export interface EventOrganizationListResponse {
  statusCode: number;
  message: string;
  result: EventOrganization[];
  total?: number;
  pagination?: any;
}

@Injectable({
  providedIn: 'root',
})
export class EventOrganizationService {
  private baseUrl = `${environment.baseUrl}/EventOrganizations`;

  constructor(private http: HttpClient) {}

  getAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string
  ): Observable<EventOrganizationListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<EventOrganizationListResponse>(this.baseUrl, { params });
  }

  getAllActive(): Observable<EventOrganizationListResponse> {
    return this.http.get<EventOrganizationListResponse>(`${this.baseUrl}/all`);
  }

  getById(id: number): Observable<EventOrganizationResponse> {
    return this.http.get<EventOrganizationResponse>(`${this.baseUrl}/${id}`);
  }

  create(organization: EventOrganization): Observable<EventOrganizationResponse> {
    return this.http.post<EventOrganizationResponse>(this.baseUrl, organization);
  }

  update(id: number, organization: EventOrganization): Observable<EventOrganizationResponse> {
    return this.http.put<EventOrganizationResponse>(`${this.baseUrl}/${id}`, organization);
  }

  delete(id: number): Observable<{ statusCode: number; message: string; result: boolean }> {
    return this.http.delete<{ statusCode: number; message: string; result: boolean }>(
      `${this.baseUrl}/${id}`
    );
  }
}

