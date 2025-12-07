import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  fullName: string;
  email: string;
  adUsername: string;
  positionId: number;
  position: {
    id: number;
    title: string;
    departmentId: number;
    department: {
      id: number;
      name: string;
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
  };
  isActive: boolean;
  isDeleted: boolean;
  createdOn: string;
}

export interface UserResponse {
  statusCode: number;
  message: string;
  result: User[];
  total: number;
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
}

export interface ADUserResponse {
  statusCode: number;
  message: string;
  result: {
    username: string;
    displayName: string;
    title: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) {}

  getUsers(page: number, pageSize: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(
      `${this.baseUrl}/Users?page=${page}&pageSize=${pageSize}`
    );
  }

  createUser(user: {
    fullName: string;
    email: string;
    adUsername: string;
    jobTitleId?: number;
    positionId?: number;
    organizationId: number;
    departmentId?: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/Users`, user);
  }

  updateUser(user: {
    id: number;
    fullName: string;
    email: string;
    adUsername: string;
    jobTitleId?: number;
    positionId?: number;
    organizationId: number;
    departmentId?: number;
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/Users/${user.id}`, user);
  }

  checkADUser(username: string): Observable<ADUserResponse> {
    return this.http.get<ADUserResponse>(
      `${this.baseUrl}/Users/ad-user/${username}`
    );
  }

  unlockUser(userId: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/Users/${userId}/Unlock`, {});
  }

  toggleUserStatus(userId: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/Users/${userId}/Toggle`, {});
  }

  getPermissions(page: number, pageSize: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/Permissions?page=${page}&pageSize=${pageSize}`
    );
  }

  createPermission(permission: {
    name: string;
    code: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Permissions`, permission);
  }

  getRoles(page: number, pageSize: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/Roles?page=${page}&pageSize=${pageSize}`
    );
  }

  getRolePermissions(page: number, pageSize: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/RolePermissions?page=${page}&pageSize=${pageSize}`
    );
  }

  createRolePermission(rolePermission: {
    roleId: number;
    permissionId: number;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/RolePermissions`,
      rolePermission
    );
  }

  createRole(role: { name: string; isActive: boolean }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Roles`, role);
  }

  deleteRolePermission(roleId: number, permissionId: number) {
    return this.http.delete(
      `${this.baseUrl}/RolePermissions/${roleId}/${permissionId}`
    );
  }

  getUserById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Users/${id}`);
  }

  // User Roles
  getUserRoles(page: number, pageSize: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/UserRoles`, {
      params: { page, pageSize },
    });
  }

  createUserRole(userRole: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/UserRoles`, userRole);
  }

  updateUserRole(id: number, userRole: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/UserRoles/${id}`, userRole);
  }

  deleteUserRole(userId: number, roleId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/UserRoles/${userId}/${roleId}`);
  }
}
