import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Department {
  id: string;
  name: string;
  code: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    code: string;
  };
  isActive: boolean;
  createdOn: string;
  updatedOn: string;
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
    return this.http.put<Department>(`${this.apiUrl}/${id}`, department);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
