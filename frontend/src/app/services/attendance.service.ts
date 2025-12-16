import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CourseAttendance {
    id: number;
    courseEnrollmentId: number;
    studentName: string;
    organizationName?: string;
    checkInTime: string;
    checkOutTime?: string;
    durationMinutes?: number;
}

@Injectable({
    providedIn: 'root'
})
export class AttendanceService {
    private apiUrl = `${environment.baseUrl}/CourseAttendance`;

    constructor(private http: HttpClient) { }

    getAttendanceByCourse(courseId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/course/${courseId}`);
    }

    checkIn(enrollmentId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/check-in/${enrollmentId}`, {});
    }

    checkOut(enrollmentId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/check-out/${enrollmentId}`, {});
    }
}
