import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';

export interface User {
  id: number;
  fullName: string;
  email: string;
  adUsername: string;
  positionId: number;
  loginMethod?: number;
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

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {}

  getUsers(
    page: number, 
    pageSize: number, 
    search?: string, 
    organizationId?: number, 
    departmentId?: number, 
    roleId?: number
  ): Observable<UserResponse> {
    let params = `page=${page}&pageSize=${pageSize}`;
    if (search) {
      params += `&search=${encodeURIComponent(search)}`;
    }
    if (organizationId) {
      params += `&organization=${organizationId}`;
    }
    if (departmentId) {
      params += `&department=${departmentId}`;
    }
    if (roleId) {
      params += `&role=${roleId}`;
    }
    return this.http.get<UserResponse>(`${this.baseUrl}/Users?${params}`);
  }

  createUser(user: {
    civilNo?: string;
    fullName: string;
    email: string;
    username?: string;
    adUsername?: string;
    jobTitleId?: number;
    positionId?: number;
    organizationId: number;
    departmentId?: number;
    departmentRole?: string;
    loginMethod?: number;
    temporaryPassword?: string;
    roleIds?: number[];
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/Users`, user);
  }

  updateUser(userId: string, user: {
    civilNo?: string;
    fullName: string;
    email: string;
    username?: string;
    adUsername?: string;
    jobTitleId?: number;
    positionId?: number;
    organizationId: number;
    departmentId?: number;
    departmentRole?: string;
    loginMethod?: number;
    temporaryPassword?: string;
    emailVerified?: boolean;
    roleIds?: number[];
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/Users/${userId}`, user);
  }

  checkADUser(username: string): Observable<ADUserResponse> {
    return this.http.get<ADUserResponse>(
      `${this.baseUrl}/Users/ad-user/${username}`
    );
  }

  unlockUser(userId: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/Users/${userId}/Unlock`, {});
  }

  toggleUserStatus(userId: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/Users/${userId}/Toggle`, {});
  }

  getUserPassword(userId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Users/${userId}/password`);
  }

  resetUserPassword(userId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Users/${userId}/reset-password`, {});
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

  updateRole(id: number, role: { name: string }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/Roles/${id}`, role);
  }

  deleteRole(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/Roles/${id}`);
  }

  deleteRolePermission(roleId: number, permissionId: number) {
    return this.http.delete(
      `${this.baseUrl}/RolePermissions/${roleId}/${permissionId}`
    );
  }

  getUserById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Users/${id}`);
  }

  getCurrentUser(): Observable<any> {
    // Get current user ID from storage
    const currentUser = this.storageService.getItem<any>('currentUser');
    if (currentUser?.id) {
      return this.getUserById(currentUser.id);
    }
    // Fallback: return empty observable
    return of({ statusCode: 404, message: 'User not found', result: null });
  }

  getDepartments(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Departments?page=1&pageSize=1000`);
  }

  getJobTitles(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/JobTitles?page=1&pageSize=1000`);
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

  updateUserRole(userId: string | number, roleId: number, userRole: any): Observable<any> {
    // Convert userId to string for the route parameter
    const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
    return this.http.put(`${this.baseUrl}/UserRoles/${userIdStr}/${roleId}`, userRole);
  }

  deleteUserRole(userId: number, roleId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/UserRoles/${userId}/${roleId}`);
  }

  uploadUsers(users: Array<{
    fullName: string;
    email: string;
    adUsername?: string;
    civilNo?: string;
    organizationId: number;
    loginMethod: number;
  }>): Observable<any> {
    return this.http.post(`${this.baseUrl}/Users/upload`, { users });
  }
}
