import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Segment {
  id: number;
  name: string;
  nameAr: string;
  code: string;
  organizationId: number;
  organization?: any;
  userIds?: string[];
  users?: any[];
  userCount: number;
  isActive: boolean;
  createdOn: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SegmentResponse {
  statusCode: number;
  message: string;
  result: Segment[];
  total: number;
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
}

export interface SegmentDetailResponse {
  statusCode: number;
  message: string;
  result: Segment;
}

export interface CreateSegmentDto {
  name: string;
  nameAr: string;
  code: string;
  organizationId: number;
  userIds?: string[];
}

export interface UpdateSegmentDto {
  id: number;
  name: string;
  nameAr: string;
  code: string;
  organizationId: number;
  userIds?: string[];
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SegmentService {
  private apiUrl = `${environment.baseUrl}/Segments`;

  constructor(private http: HttpClient) {}

  getSegments(
    page: number = 1,
    pageSize: number = 10,
    organizationId?: number
  ): Observable<SegmentResponse> {
    let params = `page=${page}&pageSize=${pageSize}`;
    if (organizationId) {
      params += `&organizationId=${organizationId}`;
    }
    return this.http.get<SegmentResponse>(`${this.apiUrl}?${params}`);
  }

  getAllSegments(organizationId?: number): Observable<SegmentDetailResponse> {
    let params = '';
    if (organizationId) {
      params = `?organizationId=${organizationId}`;
    }
    return this.http.get<SegmentDetailResponse>(`${this.apiUrl}/all${params}`);
  }

  getSegment(id: number): Observable<SegmentDetailResponse> {
    return this.http.get<SegmentDetailResponse>(`${this.apiUrl}/${id}`);
  }

  getSegmentsByOrganization(organizationId: number): Observable<SegmentDetailResponse> {
    return this.http.get<SegmentDetailResponse>(`${this.apiUrl}/by-organization/${organizationId}`);
  }

  createSegment(segment: CreateSegmentDto): Observable<SegmentDetailResponse> {
    return this.http.post<SegmentDetailResponse>(this.apiUrl, segment);
  }

  updateSegment(id: number, segment: UpdateSegmentDto): Observable<SegmentDetailResponse> {
    return this.http.put<SegmentDetailResponse>(`${this.apiUrl}/${id}`, segment);
  }

  deleteSegment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  assignUsers(segmentId: number, userIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${segmentId}/assign-users`, { segmentId, userIds });
  }

  removeUsers(segmentId: number, userIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${segmentId}/remove-users`, { segmentId, userIds });
  }
}
