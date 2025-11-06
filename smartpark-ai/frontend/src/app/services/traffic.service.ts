import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TrafficService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllTrafficData(congestionLevel?: string, limit: number = 50): Observable<any> {
    let params = new HttpParams().set('limit', limit.toString());
    if (congestionLevel) params = params.set('congestion_level', congestionLevel);
    
    return this.http.get(`${this.apiUrl}/traffic`, { params });
  }

  getTrafficHeatmap(): Observable<any> {
    return this.http.get(`${this.apiUrl}/traffic/heatmap`);
  }

  getTrafficByLocation(lat: number, lng: number, radius: number = 5): Observable<any> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString())
      .set('radius', radius.toString());
    
    return this.http.get(`${this.apiUrl}/traffic/nearby`, { params });
  }

  getTrafficStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/traffic/stats`);
  }

  getRealTimeTraffic(): Observable<any> {
    return this.http.get(`${this.apiUrl}/traffic/realtime`);
  }
}
