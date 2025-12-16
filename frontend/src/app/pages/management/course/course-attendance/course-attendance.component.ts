import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttendanceService, CourseAttendance } from '../../../../services/attendance.service';
import { Course } from '../../../../services/course.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-course-attendance',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './course-attendance.component.html'
})
export class CourseAttendanceComponent implements OnInit {
    @Input() courseId?: number;
    @Input() course?: Course;

    attendanceRecords: CourseAttendance[] = [];
    groupedAttendance: { [key: string]: CourseAttendance[] } = {};
    attendanceOrganizations: string[] = [];
    isLoading = false;
    totalAttendance = 0;

    constructor(
        private attendanceService: AttendanceService,
        private toastr: ToastrService,
        private cdr: ChangeDetectorRef,
        private translateService: TranslateService
    ) { }

    ngOnInit(): void {
        if (this.courseId) {
            this.loadAttendance();
        }
    }

    loadAttendance(): void {
        if (!this.courseId) return;

        this.isLoading = true;
        this.cdr.detectChanges();

        this.attendanceService.getAttendanceByCourse(this.courseId).subscribe({
            next: (response: any) => {
                // Handle different response structures (camelCase, PascalCase, or direct array)
                const data = response?.result || response?.Result || response || [];
                this.attendanceRecords = Array.isArray(data) ? data : [];
                this.totalAttendance = this.attendanceRecords.length;
                this.isLoading = false;
                
                // Group attendance by organization
                this.groupAttendanceByOrganization();
                
                this.cdr.detectChanges();
            },
            error: (err: any) => {
                this.isLoading = false;
                this.cdr.detectChanges();
                this.toastr.error(err.error?.message || 'Failed to load attendance records');
            }
        });
    }

    groupAttendanceByOrganization(): void {
        const grouped: { [key: string]: CourseAttendance[] } = {};

        // Sort attendance by check-in time (newest first)
        const sortedAttendance = [...this.attendanceRecords].sort((a, b) => {
            const dateA = new Date(a.checkInTime).getTime();
            const dateB = new Date(b.checkInTime).getTime();
            return dateB - dateA; // Descending order
        });

        sortedAttendance.forEach(record => {
            const orgName = record.organizationName || 'Unknown Organization';
            if (!grouped[orgName]) {
                grouped[orgName] = [];
            }
            grouped[orgName].push(record);
        });

        this.groupedAttendance = grouped;
        this.attendanceOrganizations = Object.keys(grouped).sort();
    }

    formatDuration(minutes?: number): string {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }

    formatDate(dateString: string): string {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    formatDateTime(dateString: string): string {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    exportAttendees(): void {
        if (!this.course || this.attendanceRecords.length === 0) {
            this.toastr.warning(this.translateService.instant('attendance.noRecords'));
            return;
        }

        // Create CSV content
        const headers = [
            this.translateService.instant('attendance.student'),
            this.translateService.instant('common.organization'),
            this.translateService.instant('attendance.checkIn'),
            this.translateService.instant('attendance.checkOut'),
            this.translateService.instant('attendance.duration')
        ];

        const rows = this.attendanceRecords.map(record => {
            const checkInTime = record.checkInTime 
                ? this.formatDateTime(record.checkInTime) 
                : '-';
            const checkOutTime = record.checkOutTime 
                ? this.formatDateTime(record.checkOutTime) 
                : '-';
            const duration = record.durationMinutes 
                ? this.formatDuration(record.durationMinutes) 
                : '-';

            return [
                record.studentName || '-',
                record.organizationName || '-',
                checkInTime,
                checkOutTime,
                duration
            ];
        });

        // Convert to CSV
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const courseTitle = this.course.courseTitle?.replace(/\s+/g, '_') || 'Course';
        const dateStr = new Date().toISOString().split('T')[0];
        link.download = `Course_Attendance_${courseTitle}_${dateStr}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.toastr.success(this.translateService.instant('attendance.exportSuccess'));
    }
}
