import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DigitalLibraryItem {
    id: number;
    name: string;
    nameAr: string;
    description: string;
    posterPath: string;
    courseId?: number;
    course?: any; // Define Course interface if needed or import
    organizationId: number;
    showPublic: boolean;
    files?: DigitalLibraryFile[]; // Optional to handle cases where API might not return files
}

export interface DigitalLibraryFile {
    id: number;
    digitalLibraryItemId: number;
    title: string;
    filePath: string;
    fileType: DigitalFileType;
    durationSeconds?: number;
    pageCount?: number;
}

export enum DigitalFileType {
    Video = 0,
    PDF = 1,
    PowerPoint = 2,
    Image = 3,
    Audio = 4,
    Other = 5
}

export interface UserDigitalLibraryProgress {
    id: number;
    userId: string;
    digitalLibraryFileId: number;
    isCompleted: boolean;
    lastPositionSeconds: number;
    completedOn?: string;
}

@Injectable({
    providedIn: 'root'
})
export class DigitalLibraryService {
    private apiUrl = `${environment.baseUrl}/DigitalLibrary`;

    constructor(private http: HttpClient) { }

    // Public Methods
    getItemsByCourseTab(routeCode: string): Observable<any> { // Adjust return type
        return this.http.get<any>(`${this.apiUrl}/public/${routeCode}`);
    }

    getItemDetails(id: number): Observable<DigitalLibraryItem> {
        return this.http.get<DigitalLibraryItem>(`${this.apiUrl}/items/${id}`);
    }

    updateProgress(progress: Partial<UserDigitalLibraryProgress>): Observable<any> {
        return this.http.post(`${this.apiUrl}/progress`, progress);
    }

    // Management Methods
    getAllItems(page: number = 1, pageSize: number = 10, courseTabId?: number): Observable<any> {
        let params = `page=${page}&pageSize=${pageSize}`;
        if (courseTabId) params += `&courseTabId=${courseTabId}`;
        return this.http.get<any>(`${this.apiUrl}?${params}`);
    }

    createItem(item: FormData): Observable<DigitalLibraryItem> {
        return this.http.post<DigitalLibraryItem>(`${this.apiUrl}`, item);
    }

    updateItem(id: number, item: FormData): Observable<DigitalLibraryItem> {
        return this.http.put<DigitalLibraryItem>(`${this.apiUrl}/${id}`, item);
    }

    deleteItem(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
