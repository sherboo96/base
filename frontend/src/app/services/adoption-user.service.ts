import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export enum AttendanceType {
  Optional = 1,
  Mandatory = 2
}

export interface AdoptionUser {
  id: number;
  name: string;
  nameAr: string;
  attendance: AttendanceType;
  email: string;
  bio?: string;
  organizationId: number;
  organization: {
    id: number;
    name: string;
    code: string;
  };
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface AdoptionUserResponse {
  statusCode: number;
  message: string;
  result: AdoptionUser[];
  total: number;
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AdoptionUserService {
  private apiUrl = `${environment.baseUrl}/AdoptionUsers`;

  constructor(private http: HttpClient) {}

  getAdoptionUsers(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    organizationId?: number
  ): Observable<AdoptionUserResponse> {
    let params = `page=${page}&pageSize=${pageSize}`;
    if (search) {
      params += `&search=${encodeURIComponent(search)}`;
    }
    if (organizationId) {
      params += `&organizationId=${organizationId}`;
    }
    return this.http.get<AdoptionUserResponse>(`${this.apiUrl}?${params}`);
  }

  getAdoptionUser(id: number): Observable<AdoptionUser> {
    return this.http.get<AdoptionUser>(`${this.apiUrl}/${id}`);
  }

  createAdoptionUser(
    adoptionUser: Omit<AdoptionUser, 'id' | 'createdOn' | 'organization' | 'isActive' | 'isDeleted'>
  ): Observable<AdoptionUser> {
    return this.http.post<AdoptionUser>(this.apiUrl, adoptionUser);
  }

  updateAdoptionUser(
    id: number,
    adoptionUser: Partial<AdoptionUser>
  ): Observable<AdoptionUser> {
    return this.http.put<AdoptionUser>(`${this.apiUrl}/${id}`, adoptionUser);
  }

  deleteAdoptionUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleAdoptionUserStatus(id: number): Observable<AdoptionUser> {
    return this.http.patch<AdoptionUser>(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}
