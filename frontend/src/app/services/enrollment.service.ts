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

export enum EnrollmentType {
  Onsite = 1,
  Online = 2
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
  isManualEnrollment?: boolean;
  locationDocumentPath?: string;
  enrollmentType?: number | string; // 1 or "Onsite" = Onsite, 2 or "Online" = Online
  questionAnswers?: string; // JSON string storing answers to course enrollment questions
  emailHistoryCount?: number; // Count of emails sent to this enrollment
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

  enrollInCourse(courseId: number, questionAnswers?: { [key: string]: string }): Observable<any> {
    return this.http.post<any>(this.apiUrl, { courseId, questionAnswers });
  }

  manualEnroll(courseId: number, userId: string, questionAnswers?: { [key: string]: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/manual`, { courseId, userId, questionAnswers });
  }

  cancelEnrollment(enrollmentId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${enrollmentId}`);
  }

  checkEnrollment(courseId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/check/${courseId}`);
  }

  approveEnrollment(enrollmentId: number, enrollmentType?: 'onsite' | 'online'): Observable<any> {
    const params = enrollmentType ? `?enrollmentType=${enrollmentType === 'online' ? 2 : 1}` : '';
    return this.http.patch<any>(`${this.apiUrl}/${enrollmentId}/approve${params}`, {});
  }

  rejectEnrollment(enrollmentId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${enrollmentId}/reject`, {});
  }

  excuseEnrollment(enrollmentId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${enrollmentId}/excuse`, {});
  }

  updateLocationDocument(enrollmentId: number, filePath: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${enrollmentId}/location-document`, {
      filePath,
    });
  }

  approveEnrollmentStep(enrollmentId: number, courseTabApprovalId: number, comments?: string, enrollmentType?: 'onsite' | 'online'): Observable<any> {
    const body: any = {
      courseEnrollmentId: enrollmentId,
      courseTabApprovalId: courseTabApprovalId,
      comments: comments
    };
    if (enrollmentType) {
      body.enrollmentType = enrollmentType === 'online' ? 2 : 1;
    }
    return this.http.post<any>(`${this.apiUrl}/approve-step`, body);
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

  getEmailTemplates(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/email-templates`);
  }

  sendBulkEmail(enrollmentIds: number[], templateFileName: string, subject: string, templateVariables?: { [key: string]: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/send-bulk-email`, {
      enrollmentIds,
      templateFileName,
      subject,
      templateVariables
    });
  }

  getEnrollmentEmailHistory(enrollmentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${enrollmentId}/email-history`);
  }

  getBadge(enrollmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${enrollmentId}/badge`, { responseType: 'blob' });
  }
}

