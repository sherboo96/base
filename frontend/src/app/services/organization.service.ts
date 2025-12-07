import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Organization {
  id: number;
  name: string;
  nameAr: string;
  code: string;
  domain: string;
  isMain: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface OrganizationResponse {
  statusCode: number;
  message: string;
  result: Organization[];
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
export class OrganizationService {
  private apiUrl = `${environment.baseUrl}/Organizations`;

  constructor(private http: HttpClient) {}

  getOrganizations(
    page: number = 1,
    pageSize: number = 10
  ): Observable<OrganizationResponse> {
    return this.http.get<OrganizationResponse>(
      `${this.apiUrl}?page=${page}&pageSize=${pageSize}`
    );
  }

  getMainOrganization(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/main`);
  }

  getOrganization(id: number): Observable<Organization> {
    return this.http.get<Organization>(`${this.apiUrl}/${id}`);
  }

  createOrganization(
    organization: Partial<Organization>
  ): Observable<any> {
    return this.http.post<any>(this.apiUrl, organization);
  }

  updateOrganization(
    id: number,
    organization: Partial<Organization>
  ): Observable<Organization> {
    return this.http.patch<Organization>(`${this.apiUrl}/${id}`, organization);
  }

  deleteOrganization(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Get organizations by parent ID
  getOrganizationsByParentId(parentId: string): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.apiUrl}/parent/${parentId}`);
  }

  // Get organization hierarchy
  getOrganizationHierarchy(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.apiUrl}/hierarchy`);
  }
}
