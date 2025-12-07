import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Position {
  id: number;
  nameEn: string;
  nameAr: string;
  title?: string; // For backward compatibility
  code?: string;
  description?: string;
  departmentId?: number;
  department: {
    id: number;
    nameEn: string;
    nameAr: string;
    organizationId: number;
    organization: {
      id: number;
      name: string;
      code: string;
      isActive: boolean;
      isDeleted: boolean;
      createdOn: string;
    };
    isActive: boolean;
    isDeleted: boolean;
    createdOn: string;
  };
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface PositionResponse {
  statusCode: number;
  message: string;
  result: Position[];
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
export class PositionService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  getPositions(page: number, pageSize: number): Observable<PositionResponse> {
    return this.http.get<PositionResponse>(`${this.baseUrl}/JobTitles`, {
      params: {
        page: page.toString(),
        pageSize: pageSize.toString(),
      },
    });
  }

  createPosition(position: {
    title: string;
    departmentId: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/JobTitles`, position);
  }
}
