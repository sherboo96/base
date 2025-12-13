import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Institution {
  id: number;
  name: string;
  nameAr: string;
  certificatePdf?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface InstitutionResponse {
  statusCode: number;
  message: string;
  result: Institution[];
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
export class InstitutionService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  getInstitutions(page: number = 1, pageSize: number = 100): Observable<InstitutionResponse> {
    const params: any = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    return this.http.get<InstitutionResponse>(`${this.baseUrl}/Institutions`, { params });
  }

  getInstitution(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Institutions/${id}`);
  }

  createInstitution(institution: {
    name: string;
    nameAr: string;
    certificatePdf?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Institutions`, institution);
  }

  updateInstitution(id: number, institution: {
    name: string;
    nameAr: string;
    certificatePdf?: string;
  }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/Institutions/${id}`, institution);
  }

  deleteInstitution(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/Institutions/${id}`);
  }
}
