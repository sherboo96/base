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
    pageSize: number = 10,
    search?: string,
    filterIsMain?: string,
    filterStatus?: string
  ): Observable<OrganizationResponse> {
    let params = `page=${page}&pageSize=${pageSize}`;
    if (search) {
      params += `&search=${encodeURIComponent(search)}`;
    }
    if (filterIsMain && filterIsMain !== 'all') {
      params += `&filterIsMain=${encodeURIComponent(filterIsMain)}`;
    }
    if (filterStatus && filterStatus !== 'all') {
      params += `&filterStatus=${encodeURIComponent(filterStatus)}`;
    }
    return this.http.get<OrganizationResponse>(`${this.apiUrl}?${params}`);
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

  // Toggle organization status
  toggleOrganizationStatus(id: number): Observable<Organization> {
    return this.http.patch<Organization>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  // Set organization as main
  setAsMainOrganization(id: number): Observable<Organization> {
    return this.http.patch<Organization>(`${this.apiUrl}/${id}/set-main`, {});
  }

  // Get available login methods for an organization
  getLoginMethods(organizationId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${organizationId}/login-methods`);
  }
}
