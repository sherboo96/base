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

export interface CourseEnrollment {
  id: number;
  courseId: number;
  userId: string;
  enrollmentAt: string;
  isActive: boolean;
  finalApproval?: boolean;
  status?: EnrollmentStatus;
  user?: {
    id: string;
    fullName: string;
    email: string;
    userName?: string;
  };
}

export interface EnrollmentResponse {
  statusCode: number;
  message: string;
  result: CourseEnrollment[];
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
export class EnrollmentService {
  private apiUrl = `${environment.baseUrl}/CourseEnrollments`;

  constructor(private http: HttpClient) {}

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
}

