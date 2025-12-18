import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CourseTab {
  id: number;
  name: string;
  nameAr: string;
  routeCode: string;
  icon?: string;
  excuseTimeHours?: number;
  organizationId: number;
  organization?: {
    id: number;
    name: string;
    code: string;
  };
  showInMenu: boolean;
  showPublic: boolean;
  showForOtherOrganizations?: boolean; // Show this tab to other organizations (only for main organization)
  showDigitalLibraryInMenu?: boolean; // Show this tab in Digital Library section for management
  showDigitalLibraryPublic?: boolean; // Show this tab in Digital Library section for public
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface CourseTabResponse {
  statusCode: number;
  message: string;
  result: CourseTab[];
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
export class CourseTabService {
  private apiUrl = `${environment.baseUrl}/CourseTabs`;
  private courseTabChanged$ = new Subject<void>();

  // Observable to notify subscribers when course tabs change
  get courseTabChanged(): Observable<void> {
    return this.courseTabChanged$.asObservable();
  }

  // Method to notify that course tabs have changed
  notifyCourseTabChanged(): void {
    this.courseTabChanged$.next();
  }

  constructor(private http: HttpClient) { }

  getCourseTabs(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    organizationId?: number,
    showInMenu?: boolean,
    showPublic?: boolean
  ): Observable<CourseTabResponse> {
    let params = `page=${page}&pageSize=${pageSize}`;
    if (search) {
      params += `&search=${encodeURIComponent(search)}`;
    }
    if (organizationId) {
      params += `&organizationId=${organizationId}`;
    }
    if (showInMenu !== undefined) {
      params += `&showInMenu=${showInMenu}`;
    }
    if (showPublic !== undefined) {
      params += `&showPublic=${showPublic}`;
    }
    return this.http.get<CourseTabResponse>(`${this.apiUrl}?${params}`);
  }

  getCourseTab(id: number): Observable<CourseTab> {
    return this.http.get<CourseTab>(`${this.apiUrl}/${id}`);
  }

  getCourseTabByRouteCode(routeCode: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-route/${routeCode}`);
  }

  createCourseTab(
    courseTab: Omit<CourseTab, 'id' | 'createdOn' | 'organization' | 'isActive' | 'isDeleted'>
  ): Observable<CourseTab> {
    return this.http.post<CourseTab>(this.apiUrl, courseTab).pipe(
      tap(() => this.notifyCourseTabChanged())
    );
  }

  updateCourseTab(
    id: number,
    courseTab: Omit<CourseTab, 'id' | 'createdOn' | 'organization' | 'isActive' | 'isDeleted'>
  ): Observable<CourseTab> {
    return this.http.put<CourseTab>(`${this.apiUrl}/${id}`, courseTab).pipe(
      tap(() => this.notifyCourseTabChanged())
    );
  }

  deleteCourseTab(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.notifyCourseTabChanged())
    );
  }

  toggleStatus(id: number): Observable<CourseTab> {
    return this.http.patch<CourseTab>(`${this.apiUrl}/${id}/toggle-status`, {}).pipe(
      tap(() => this.notifyCourseTabChanged())
    );
  }

  toggleShowInMenu(id: number): Observable<CourseTab> {
    return this.http.patch<CourseTab>(`${this.apiUrl}/${id}/toggle-menu`, {}).pipe(
      tap(() => this.notifyCourseTabChanged())
    );
  }

  toggleShowPublic(id: number): Observable<CourseTab> {
    return this.http.patch<CourseTab>(`${this.apiUrl}/${id}/toggle-public`, {}).pipe(
      tap(() => this.notifyCourseTabChanged())
    );
  }
}
