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
    const params: any = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    return this.http.get<PositionResponse>(`${this.baseUrl}/Positions`, { params });
  }

  getPosition(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Positions/${id}`);
  }

  createPosition(position: {
    nameEn: string;
    nameAr: string;
    code?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Positions`, position);
  }

  updatePosition(id: number, position: {
    nameEn: string;
    nameAr: string;
    code?: string;
  }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/Positions/${id}`, position);
  }

  deletePosition(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/Positions/${id}`);
  }
}
