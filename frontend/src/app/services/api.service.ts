import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root', // Makes this service available globally
})
export class ApiService {
  private baseUrl = environment.baseUrl; // Replace with your API base URL

  constructor(private http: HttpClient) {}

  _getData(endpoint: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${endpoint}`);
  }

  // GET method for fetching data
  getData(endpoint: string, params?: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/${endpoint}`, { params });
  }

  // POST method for creating data
  postData(endpoint: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${endpoint}`, data);
  }

  // PUT method for updating data
  updateData(endpoint: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${endpoint}`, data);
  }

  // DELETE method for deleting data
  deleteData(endpoint: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${endpoint}`);
  }
}
