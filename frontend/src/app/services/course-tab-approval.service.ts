import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CourseTabApproval {
  id?: number;
  courseTabId: number;
  approvalOrder: number;
  isHeadApproval: boolean;
  isFinalApproval: boolean;
  roleId?: number;
  role?: {
    id: number;
    name: string;
    applyToAllOrganizations: boolean;
    organizationId?: number;
    isDefault: boolean;
  };
  courseTab?: {
    id: number;
    name: string;
    nameAr: string;
    routeCode: string;
  };
  isActive?: boolean;
}

export interface CourseTabApprovalResponse {
  statusCode: number;
  message: string;
  result: CourseTabApproval[];
  total?: number;
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class CourseTabApprovalService {
  private apiUrl = `${environment.baseUrl}/CourseTabApprovals`;

  constructor(private http: HttpClient) {}

  getCourseTabApprovals(
    page: number = 1,
    pageSize: number = 10,
    courseTabId?: number
  ): Observable<CourseTabApprovalResponse> {
    let params = `page=${page}&pageSize=${pageSize}`;
    if (courseTabId) {
      params += `&courseTabId=${courseTabId}`;
    }
    return this.http.get<CourseTabApprovalResponse>(`${this.apiUrl}?${params}`);
  }

  getCourseTabApproval(id: number): Observable<CourseTabApproval> {
    return this.http.get<CourseTabApproval>(`${this.apiUrl}/${id}`);
  }

  getApprovalsByCourseTab(courseTabId: number): Observable<CourseTabApprovalResponse> {
    return this.http.get<CourseTabApprovalResponse>(`${this.apiUrl}/course-tab/${courseTabId}`);
  }

  createCourseTabApproval(
    approval: Omit<CourseTabApproval, 'id' | 'role' | 'courseTab' | 'isActive'>
  ): Observable<CourseTabApproval> {
    return this.http.post<CourseTabApproval>(this.apiUrl, approval);
  }

  updateCourseTabApproval(
    id: number,
    approval: { approvalOrder: number; isHeadApproval: boolean; isFinalApproval: boolean; roleId?: number | null }
  ): Observable<CourseTabApproval> {
    return this.http.put<CourseTabApproval>(`${this.apiUrl}/${id}`, approval);
  }

  deleteCourseTabApproval(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${id}`);
  }
}

