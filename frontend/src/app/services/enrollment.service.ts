import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export enum EnrollmentStatus {
  Pending = 1,
  Approve = 2,
  Reject = 3,
  Excuse = 4
}

export interface CourseEnrollmentApprovalStep {
  id: number;
  courseEnrollmentId: number;
  courseTabApprovalId: number;
  approvedBy?: string;
  approvedAt?: string;
  isApproved: boolean;
  isRejected: boolean;
  comments?: string;
  approvedByUser?: {
    id: string;
    fullName: string;
    email: string;
    userName?: string;
    organizationId?: number;
    organizationName?: string;
    organizationIsMain?: boolean;
    departmentId?: number;
    departmentName?: string;
    jobTitle?: string;
  };
  courseTabApproval?: {
    id: number;
    courseTabId: number;
    approvalOrder: number;
    isHeadApproval: boolean;
    roleId?: number;
    role?: {
      id: number;
      name: string;
      applyToAllOrganizations: boolean;
      organizationId?: number;
      isDefault: boolean;
    };
  };
}

export interface CourseEnrollment {
  id: number;
  courseId: number;
  userId: string;
  enrollmentAt: string;
  isActive: boolean;
  finalApproval?: boolean;
  status?: EnrollmentStatus;
  course?: {
    id: number;
    courseTitle: string;
    courseTitleAr?: string;
    courseTabId: number;
    startDateTime?: string;
    endDateTime?: string;
  };
  user?: {
    id: string;
    fullName: string;
    email: string;
    userName?: string;
    organizationId?: number;
    organizationName?: string;
    organizationIsMain?: boolean;
    departmentId?: number;
    departmentName?: string;
    jobTitle?: string;
  };
  approvalSteps?: CourseEnrollmentApprovalStep[];
}

export interface EnrollmentResponse {
  statusCode: number;
  message: string;
  result?: CourseEnrollment[];
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
export class EnrollmentService {
  private apiUrl = `${environment.baseUrl}/CourseEnrollments`;

  constructor(private http: HttpClient) { }

  getEnrollmentsByCourse(courseId: number, page: number = 1, pageSize: number = 20): Observable<EnrollmentResponse> {
    return this.http.get<EnrollmentResponse>(`${this.apiUrl}/course/${courseId}?page=${page}&pageSize=${pageSize}`);
  }

  enrollInCourse(courseId: number): Observable<any> {
    return this.http.post<any>(this.apiUrl, { courseId });
  }

  cancelEnrollment(enrollmentId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${enrollmentId}`);
  }

  checkEnrollment(courseId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/check/${courseId}`);
  }

  approveEnrollment(enrollmentId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${enrollmentId}/approve`, {});
  }

  rejectEnrollment(enrollmentId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${enrollmentId}/reject`, {});
  }

  excuseEnrollment(enrollmentId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${enrollmentId}/excuse`, {});
  }

  approveEnrollmentStep(enrollmentId: number, courseTabApprovalId: number, comments?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/approve-step`, {
      courseEnrollmentId: enrollmentId,
      courseTabApprovalId: courseTabApprovalId,
      comments: comments
    });
  }

  rejectEnrollmentStep(enrollmentId: number, courseTabApprovalId: number, comments?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reject-step`, {
      courseEnrollmentId: enrollmentId,
      courseTabApprovalId: courseTabApprovalId,
      comments: comments
    });
  }

  resendConfirmationEmail(enrollmentId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${enrollmentId}/resend-confirmation`, {});
  }

  exportEnrollments(courseId: number, status?: EnrollmentStatus, organizationId?: number): Observable<Blob> {
    let url = `${this.apiUrl}/export?courseId=${courseId}`;
    if (status !== undefined) {
      url += `&status=${status}`;
    }
    if (organizationId !== undefined) {
      url += `&organizationId=${organizationId}`;
    }
    return this.http.get(url, { responseType: 'blob' });
  }

  getPendingHeadApprovals(page: number = 1, pageSize: number = 20): Observable<EnrollmentResponse> {
    return this.http.get<EnrollmentResponse>(`${this.apiUrl}/pending-head-approvals?page=${page}&pageSize=${pageSize}`);
  }
}

