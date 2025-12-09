import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export enum LocationCategory {
  Onsite = 1,
  Online = 2,
  OutSite = 3,
  Abroad = 4
}

export interface Location {
  id: number;
  name: string;
  nameAr: string;
  floor?: string;
  building?: string;
  category: LocationCategory;
  organizationId: number;
  organization: {
    id: number;
    name: string;
    code: string;
  };
  logo?: string;
  template?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface LocationResponse {
  statusCode: number;
  message: string;
  result: Location[];
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
export class LocationService {
  private apiUrl = `${environment.baseUrl}/Locations`;

  constructor(private http: HttpClient) {}

  getLocations(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    organizationId?: number,
    filterCategory?: string
  ): Observable<LocationResponse> {
    let params = `page=${page}&pageSize=${pageSize}`;
    if (search) {
      params += `&search=${encodeURIComponent(search)}`;
    }
    if (organizationId) {
      params += `&organizationId=${organizationId}`;
    }
    if (filterCategory && filterCategory !== 'all') {
      params += `&filterCategory=${encodeURIComponent(filterCategory)}`;
    }
    return this.http.get<LocationResponse>(`${this.apiUrl}?${params}`);
  }

  getLocation(id: number): Observable<Location> {
    return this.http.get<Location>(`${this.apiUrl}/${id}`);
  }

  createLocation(
    location: Omit<Location, 'id' | 'createdOn' | 'organization' | 'isActive' | 'isDeleted'>
  ): Observable<Location> {
    return this.http.post<Location>(this.apiUrl, location);
  }

  updateLocation(
    id: number,
    location: Partial<Location>
  ): Observable<Location> {
    return this.http.put<Location>(`${this.apiUrl}/${id}`, location);
  }

  deleteLocation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleLocationStatus(id: number): Observable<Location> {
    return this.http.patch<Location>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  uploadLogo(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/${id}/upload-logo`, formData);
  }

  uploadTemplate(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/${id}/upload-template`, formData);
  }
}
