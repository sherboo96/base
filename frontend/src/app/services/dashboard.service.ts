import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  lockedUsers: number;
  totalOrganizations: number;
  totalDepartments: number;
  totalRoles: number;
  totalSegments: number;
  totalLocations: number;
  totalInstructors: number;
  totalInstitutions: number;
  totalAdoptionUsers: number;
  totalJobTitles: number;
  totalPositions: number;
  usersByLoginMethod: { [key: string]: number };
  usersByOrganization: { [key: string]: number };
  usersWithTemporaryPassword: number;
}

export interface DashboardResponse {
  statusCode: number;
  message: string;
  result: DashboardStatistics | null;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = `${environment.baseUrl}/Dashboard`;

  constructor(private http: HttpClient) { }

  getStatistics(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.apiUrl}/statistics`);
  }

  getUserStatistics(): Observable<UserDashboardResponse> {
    return this.http.get<UserDashboardResponse>(`${this.apiUrl}/user-statistics`);
  }
}

export interface UserDashboardStatistics {
  approvedCourses: any[];
  approvedCoursesCount: number;
  attendedCourses: any[];
  attendedCoursesCount: number;
  attendedHours: number;
  rank: number;
  organizationId: number;
}

export interface UserDashboardResponse {
  statusCode: number;
  message: string;
  result: UserDashboardStatistics | null;
}
