import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  submitReport(slotId: number, reportType: string, description?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports`, {
      slot_id: slotId,
      report_type: reportType,
      description
    });
  }

  getAllReports(status?: string, limit: number = 50): Observable<any> {
    let params = new HttpParams().set('limit', limit.toString());
    if (status) params = params.set('status', status);
    
    return this.http.get(`${this.apiUrl}/reports`, { params });
  }

  getUserReports(limit: number = 20): Observable<any> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/reports/user`, { params });
  }

  verifyReport(id: number, status: 'verified' | 'rejected'): Observable<any> {
    return this.http.put(`${this.apiUrl}/reports/${id}/verify`, { status });
  }

  getReportStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/stats`);
  }

  getLeaderboard(limit: number = 20): Observable<any> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/reports/leaderboard`, { params });
  }
}
