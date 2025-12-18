import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Department {
  id: number;
  nameEn: string;
  nameAr: string;
  code: string;
  type: string;
  level: string;
  organizationId: number;
  organization: {
    id: number;
    name: string;
    code: string;
  };
  parentDepartmentId?: number | null;
  parentDepartment?: {
    id: number;
    nameEn: string;
    nameAr: string;
    code: string;
  } | null;
  orderIndex?: number | null;
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface DepartmentResponse {
  statusCode: number;
  message: string;
  result: Department[];
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
export class DepartmentService {
  private apiUrl = `${environment.baseUrl}/Departments`;

  constructor(private http: HttpClient) {}

  getDepartments(
    page: number = 1,
    pageSize: number = 10
  ): Observable<DepartmentResponse> {
    return this.http.get<DepartmentResponse>(
      `${this.apiUrl}?page=${page}&pageSize=${pageSize}`
    );
  }

  getAllDepartments(organizationId?: number): Observable<any> {
    const url = organizationId 
      ? `${this.apiUrl}/all?organizationId=${organizationId}`
      : `${this.apiUrl}/all`;
    return this.http.get<any>(url);
  }

  getDepartment(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.apiUrl}/${id}`);
  }

  createDepartment(
    department: Omit<Department, 'id' | 'createdOn' | 'organization'>
  ): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, department);
  }

  updateDepartment(
    id: number,
    department: Partial<Department>
  ): Observable<Department> {
    return this.http.patch<Department>(`${this.apiUrl}/${id}`, department);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  moveDepartment(id: number, newParentDepartmentId: number | null, newOrderIndex?: number | null): Observable<Department> {
    return this.http.patch<Department>(`${this.apiUrl}/${id}/move`, {
      newParentDepartmentId: newParentDepartmentId,
      newOrderIndex: newOrderIndex ?? null
    });
  }

  uploadDepartments(departments: Array<{
    nameEn: string;
    nameAr: string;
    code: string;
    type: string;
    level: string;
    organizationId: number;
    parentDepartmentId?: number | null;
    originalId?: number | null;
  }>): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload`, { departments });
  }
}
