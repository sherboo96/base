import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JobTitle {
  id: number;
  nameEn: string;
  nameAr: string;
  code?: string;
  description?: string;
  departmentId?: number;
  department?: {
    id: number;
    nameEn: string;
    nameAr: string;
    organization?: {
      id: number;
      name: string;
      code: string;
    };
  };
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface JobTitleResponse {
  statusCode: number;
  message: string;
  result: JobTitle[];
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
export class JobTitleService {
  private apiUrl = `${environment.baseUrl}/JobTitles`;

  constructor(private http: HttpClient) {}

  getJobTitles(
    page: number = 1,
    pageSize: number = 10,
    department?: number
  ): Observable<JobTitleResponse> {
    const params: any = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    if (department) {
      params.department = department.toString();
    }
    return this.http.get<JobTitleResponse>(this.apiUrl, { params });
  }

  getJobTitle(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createJobTitle(jobTitle: {
    nameEn: string;
    nameAr: string;
    code?: string;
    description?: string;
    departmentId?: number;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, jobTitle);
  }

  updateJobTitle(
    id: number,
    jobTitle: {
      nameEn: string;
      nameAr: string;
      code?: string;
      description?: string;
      departmentId?: number;
    }
  ): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, jobTitle);
  }

  deleteJobTitle(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}

