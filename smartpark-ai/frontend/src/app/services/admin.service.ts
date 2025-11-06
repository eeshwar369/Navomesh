import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboardAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/analytics`);
  }

  getSystemStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/stats`);
  }

  getTimeSeriesData(type?: string, days: number = 7): Observable<any> {
    let params = new HttpParams().set('days', days.toString());
    if (type) params = params.set('type', type);
    
    return this.http.get(`${this.apiUrl}/admin/timeseries`, { params });
  }

  exportData(type: string): Observable<any> {
    const params = new HttpParams().set('type', type);
    return this.http.get(`${this.apiUrl}/admin/export`, { params });
  }
}
