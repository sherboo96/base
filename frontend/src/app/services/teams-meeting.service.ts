import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BaseResponse<T> {
  statusCode: number;
  message: string;
  result?: T;
  total?: number;
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
}

export interface TeamsMeetingResponse {
  eventId?: string;
  joinUrl?: string;
  subject?: string;
  startDateTime?: string;
  endDateTime?: string;
  attendeesCount?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TeamsMeetingService {
  private apiUrl = `${environment.baseUrl}/Courses`;

  constructor(private http: HttpClient) {}

  createTeamsMeetingForCourse(courseId: number): Observable<BaseResponse<TeamsMeetingResponse>> {
    return this.http.post<BaseResponse<TeamsMeetingResponse>>(
      `${this.apiUrl}/${courseId}/create-teams-meeting`,
      {}
    );
  }

  getTeamsMeetingForCourse(courseId: number): Observable<BaseResponse<TeamsMeetingResponse & { Attendees?: any[], CreatedAt?: string }>> {
    return this.http.get<BaseResponse<TeamsMeetingResponse & { Attendees?: any[], CreatedAt?: string }>>(
      `${this.apiUrl}/${courseId}/teams-meeting`
    );
  }

  cancelTeamsMeetingForCourse(courseId: number): Observable<BaseResponse<any>> {
    return this.http.delete<BaseResponse<any>>(
      `${this.apiUrl}/${courseId}/teams-meeting`
    );
  }

  updateTeamsMeetingForCourse(courseId: number): Observable<BaseResponse<TeamsMeetingResponse>> {
    return this.http.put<BaseResponse<TeamsMeetingResponse>>(
      `${this.apiUrl}/${courseId}/update-teams-meeting`,
      {}
    );
  }
}
