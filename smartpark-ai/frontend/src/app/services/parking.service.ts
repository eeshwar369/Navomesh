import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ParkingSlot {
  id: number;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  total_capacity: number;
  occupied_slots: number;
  available_slots?: number;
  occupancy_percentage?: string;
  hourly_rate: number;
  area: string;
  status: 'available' | 'full' | 'maintenance';
  last_updated: string;
  distance?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParkingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllSlots(area?: string, status?: string): Observable<any> {
    let params = new HttpParams();
    if (area) params = params.set('area', area);
    if (status) params = params.set('status', status);
    
    return this.http.get(`${this.apiUrl}/parking/slots`, { params });
  }

  getNearbySlots(lat: number, lng: number, radius: number = 5): Observable<any> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString())
      .set('radius', radius.toString());
    
    return this.http.get(`${this.apiUrl}/parking/slots/nearby`, { params });
  }

  getSlotById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/parking/slots/${id}`);
  }

  updateSlotStatus(id: number, occupiedSlots: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/parking/slots/${id}/update`, {
      occupied_slots: occupiedSlots
    });
  }

  getParkingStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/parking/stats`);
  }

  getParkingPredictions(slotId?: number, hour?: number, day?: number): Observable<any> {
    let params = new HttpParams();
    if (slotId) params = params.set('slot_id', slotId.toString());
    if (hour !== undefined) params = params.set('hour', hour.toString());
    if (day !== undefined) params = params.set('day', day.toString());
    
    return this.http.get(`${this.apiUrl}/parking/predict`, { params });
  }
}
