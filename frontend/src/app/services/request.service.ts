import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ActivityStatus {
  nameAr: string;
  nameEn: string;
  id: number;
  isDeleted: boolean;
  createdOn: string;
}

export interface Request {
  transID: string;
  transDate: string;
  requesterCivilID: string;
  requesterName: string;
  licN_CentralNumber: string;
  licN_CivilID: string;
  licN_CommNumber: string;
  licN_TypeID: number;
  licN_TypeDesc: string;
  commBookNumber: string;
  companyName: string;
  addressAutoNumber: string;
  address: string;
  email: string;
  phoneNumber: string;
  statusId: number;
  requestOperations: Array<{
    operation: {
      nameAr: string;
      nameEn: string;
      mociCode: number;
      id: number;
      isDeleted: boolean;
      createdOn: string;
    };
  }>;
  activities: Array<{
    requestId: number;
    code: string;
    name: string;
    description: string;
    operationId: number;
    statusId: number;
    status: {
      nameAr: string;
      nameEn: string;
      id: number;
      isDeleted: boolean;
      createdOn: string;
    };
    id: number;
    isDeleted: boolean;
    createdOn: string;
    updatedAt?: string;
  }>;
  id: number;
  isDeleted: boolean;
  createdOn: string;
  updatedAt?: string;
}

export interface RequestResponse {
  statusCode: number;
  result: Request[];
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
}

export interface ActivityStatusResponse {
  statusCode: number;
  result: ActivityStatus[];
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private apiUrl = `${environment.baseUrl}/requests`;

  constructor(private http: HttpClient) {}

  getRequests(
    page: number = 1,
    pageSize: number = 10,
    order: string = 'DESC'
  ): Observable<RequestResponse> {
    return this.http.get<RequestResponse>(
      `${this.apiUrl}?page=${page}&pageSize=${pageSize}&order=${order}`
    );
  }

  getRequestDetails(
    id: number
  ): Observable<{ statusCode: number; result: Request }> {
    console.log('Fetching request details from:', `${this.apiUrl}/${id}`);
    return this.http.get<{ statusCode: number; result: Request }>(
      `${this.apiUrl}/${id}`
    );
  }

  getActivityStatuses(): Observable<ActivityStatusResponse> {
    return this.http.get<ActivityStatusResponse>(
      `${environment.baseUrl}/ActivitiesStatuses`
    );
  }

  updateActivityStatus(activityId: number, statusId: number): Observable<any> {
    return this.http.patch<void>(
      `${environment.baseUrl}/activities/${activityId}`,
      statusId
    );
  }

  updateApproval(requestId: number, commentReply: string): Observable<any> {
    const payload = {
      requestId,
      commentReply,
    };
    return this.http.post(
      `${environment.baseUrl}/MociReplys/UpdateApproval`,
      payload
    );
  }
}
