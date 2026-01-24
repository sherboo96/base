import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export enum CourseStatus {
  Draft = 1,
  Published = 2,
  RegistrationClosed = 3,
  Active = 4,
  Completed = 5,
  Canceled = 6,
  Archived = 7,
  Rescheduled = 8
}

export enum CourseLanguage {
  Arabic = 1,
  English = 2
}

export enum LocationCategory {
  Onsite = 1,
  Online = 2,
  OutSite = 3,
  Abroad = 4
}

export enum TargetUserType {
  ForOurOrganization = 1,
  All = 2,
  SpecificDepartments = 3,
  SpecificOrganizations = 4,
  SpecificSegments = 5,
  AllUsersOfOrganization = 6, // For non-main organizations
  SpecificOrganizationSegment = 7 // For non-main organizations
}

export enum AdoptionType {
  GatePass = 1,
  OnlineMeeting = 2,
  Other = 3
}

export enum AttendanceType {
  Optional = 1,
  Mandatory = 2
}

export interface CourseLearningOutcome {
  id?: number;
  name: string;
  nameAr?: string;
  courseId?: number;
}

export interface CourseContent {
  id?: number;
  name: string;
  nameAr?: string;
  courseId?: number;
}

export interface CourseAdoptionUser {
  id?: number;
  courseId?: number;
  adoptionUserId: number;
  adoptionUser?: any;
  adoptionType: AdoptionType;
  attendanceType?: AttendanceType;
}

export interface CourseContact {
  id?: number;
  courseId?: number;
  name: string;
  phoneNumber?: string;
  emailAddress?: string;
}

export interface Course {
  id?: number;
  name: string;
  nameAr?: string;
  code: string;
  courseTitle: string;
  courseTitleAr?: string;
  description?: string;
  descriptionAr?: string;
  language: CourseLanguage;
  status: CourseStatus;
  category: LocationCategory;
  locationId?: number;
  location?: any;
  startDateTime?: string;
  endDateTime?: string;
  availableSeats: number;
  availableOnlineSeats: number;
  onlineEnrollmentsCount?: number; // Number of approved online enrollments
  onsiteEnrollmentsCount?: number; // Number of approved onsite enrollments
  price: number;
  kpiWeight: number;
  digitLibraryAvailability: boolean;
  certificateAvailable: boolean;
  courseTabId: number;
  courseTab?: any;
  organizationId: number;
  organization?: any;
  learningOutcomes?: CourseLearningOutcome[];
  courseContents?: CourseContent[];
  instructorIds?: number[];
  instructors?: any[];
  adoptionUsers?: CourseAdoptionUser[];
  courseContacts?: CourseContact[];
  isActive?: boolean;
  isDeleted?: boolean;
  targetUserType?: TargetUserType;
  targetDepartmentIds?: number[];
  targetDepartmentRole?: string; // "Head", "Member", or "Both" - DEPRECATED: Use targetDepartmentRoles instead
  targetDepartmentRoles?: { [key: number]: string }; // Dictionary mapping department IDs to roles, e.g., {1: "Head", 2: "Member", 3: "Both"}
  targetOrganizationIds?: number[];
  targetSegmentIds?: number[];
  questions?: CourseQuestion[]; // JSON array of course enrollment questions
  teamsEventId?: string; // Microsoft Graph Event ID
  teamsJoinUrl?: string; // Teams meeting join URL
  teamsMeetingCreatedAt?: string; // When the Teams meeting was created
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  isEnrolled?: boolean;
  enrollmentStatus?: string; // "Pending", "Approved", "Rejected", etc.
  enrollmentId?: number;
}

export interface CourseQuestion {
  id: string; // Unique identifier for the question
  question: string; // Question text
  questionAr?: string; // Question text in Arabic
  type: 'yesno' | 'shortanswer'; // Question type
  required: boolean; // Whether the question is required
}

export interface CourseResponse {
  statusCode: number;
  message: string;
  result: Course[];
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
export class CourseService {
  private apiUrl = `${environment.baseUrl}/Courses`;
  private courseChanged$ = new Subject<void>();

  // Observable to notify subscribers when courses change
  get courseChanged(): Observable<void> {
    return this.courseChanged$.asObservable();
  }

  // Method to notify that courses have changed
  notifyCourseChanged(): void {
    this.courseChanged$.next();
  }

  constructor(private http: HttpClient) { }

  getCourses(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    organizationId?: number,
    courseTabId?: number,
    status?: CourseStatus,
    startDateFrom?: string,
    startDateTo?: string,
    endDateFrom?: string,
    endDateTo?: string,
    locationId?: number
  ): Observable<CourseResponse> {
    let params = `page=${page}&pageSize=${pageSize}`;
    if (search) {
      params += `&search=${encodeURIComponent(search)}`;
    }
    if (organizationId) {
      params += `&organizationId=${organizationId}`;
    }
    if (courseTabId) {
      params += `&courseTabId=${courseTabId}`;
    }
    if (status !== undefined) {
      params += `&status=${status}`;
    }
    if (startDateFrom) {
      params += `&startDateFrom=${encodeURIComponent(startDateFrom)}`;
    }
    if (startDateTo) {
      params += `&startDateTo=${encodeURIComponent(startDateTo)}`;
    }
    if (endDateFrom) {
      params += `&endDateFrom=${encodeURIComponent(endDateFrom)}`;
    }
    if (endDateTo) {
      params += `&endDateTo=${encodeURIComponent(endDateTo)}`;
    }
    if (locationId) {
      params += `&locationId=${locationId}`;
    }
    return this.http.get<CourseResponse>(`${this.apiUrl}?${params}`);
  }

  getCourse(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createCourse(course: Omit<Course, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>): Observable<Course> {
    return this.http.post<Course>(this.apiUrl, course).pipe(
      tap(() => this.notifyCourseChanged())
    );
  }

  updateCourse(id: number, course: Omit<Course, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>): Observable<Course> {
    return this.http.put<Course>(`${this.apiUrl}/${id}`, course).pipe(
      tap(() => this.notifyCourseChanged())
    );
  }

  deleteCourse(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.notifyCourseChanged())
    );
  }

  toggleStatus(id: number): Observable<Course> {
    return this.http.patch<Course>(`${this.apiUrl}/${id}/toggle-status`, {}).pipe(
      tap(() => this.notifyCourseChanged())
    );
  }
}
