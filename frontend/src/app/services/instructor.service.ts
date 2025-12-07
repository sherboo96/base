import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Instructor {
  id: number;
  nameEn: string;
  nameAr: string;
  email: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  institutionId: number;
  institution?: {
    id: number;
    name: string;
    nameAr: string;
  };
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface InstructorResponse {
  statusCode: number;
  message: string;
  result: Instructor[];
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
export class InstructorService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  getInstructors(page: number = 1, pageSize: number = 10, institution?: number): Observable<InstructorResponse> {
    const params: any = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    if (institution) {
      params.institution = institution.toString();
    }
    return this.http.get<InstructorResponse>(`${this.baseUrl}/Instructors`, { params });
  }

  getInstructor(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Instructors/${id}`);
  }

  createInstructor(instructor: {
    nameEn: string;
    nameAr: string;
    email: string;
    phone?: string;
    bio?: string;
    profileImage?: string;
    institutionId: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Instructors`, instructor);
  }

  updateInstructor(id: number, instructor: {
    nameEn: string;
    nameAr: string;
    email: string;
    phone?: string;
    bio?: string;
    profileImage?: string;
    institutionId: number;
  }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/Instructors/${id}`, instructor);
  }

  deleteInstructor(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/Instructors/${id}`);
  }
}
