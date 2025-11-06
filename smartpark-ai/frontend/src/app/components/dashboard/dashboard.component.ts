import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';
import { AuthService } from '../../services/auth.service';
import { ParkingService, ParkingSlot } from '../../services/parking.service';
import { TrafficService } from '../../services/traffic.service';
import { ReportsService } from '../../services/reports.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  map!: google.maps.Map;
  markers: google.maps.Marker[] = [];
  userMarker!: google.maps.Marker;
  
  parkingSlots = signal<ParkingSlot[]>([]);
  selectedSlot = signal<ParkingSlot | null>(null);
  userLocation = signal<{ lat: number; lng: number } | null>(null);
  loading = signal(true);
  showReportModal = signal(false);
  reportType = 'available';

  constructor(
    public authService: AuthService,
    private parkingService: ParkingService,
    private trafficService: TrafficService,
    private reportsService: ReportsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeMap();
    this.getUserLocation();
  }

  async initializeMap(): Promise<void> {
    // Check if Google Maps API key is configured
    if (!environment.googleMapsApiKey || environment.googleMapsApiKey === '') {
      console.warn('⚠️ Google Maps API key is not configured. Add your API key to frontend/src/environments/environment.ts');
      console.warn('Get your API key from: https://console.cloud.google.com/');
      this.loading.set(false);
      // Still load parking slots even without map
      this.loadParkingSlots();
      return;
    }

    const loader = new Loader({
      apiKey: environment.googleMapsApiKey,
      version: 'weekly',
      libraries: ['places', 'visualization']
    });

    try {
      await loader.load();
      
      // Default location (Mumbai)
      const defaultLocation = { lat: 19.0760, lng: 72.8777 };
      
      const mapElement = document.getElementById('map') as HTMLElement;
      if (!mapElement) {
        console.error('Map container element not found');
        this.loading.set(false);
        return;
      }

      this.map = new google.maps.Map(mapElement, {
        center: defaultLocation,
        zoom: 12,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] }
        ]
      });

      this.loadParkingSlots();
      this.loadTrafficHeatmap();
    } catch (error: any) {
      console.error('❌ Error loading Google Maps:', error);
      console.error('Make sure your API key is valid and Google Maps JavaScript API is enabled');
      this.loading.set(false);
      // Still load parking slots even if map fails
      this.loadParkingSlots();
    }
  }

  getUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.userLocation.set(userPos);
          
          // Only update map if it exists
          if (this.map) {
            this.map.setCenter(userPos);
            
            // Add user marker
            this.userMarker = new google.maps.Marker({
              position: userPos,
              map: this.map,
              title: 'Your Location',
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
              }
            });
          }

          // Load nearby slots
          this.loadNearbySlots(userPos.lat, userPos.lng);
        },
        (error) => {
          console.log('Geolocation error:', error);
          this.loadParkingSlots();
        }
      );
    } else {
      this.loadParkingSlots();
    }
  }

  loadParkingSlots(): void {
    this.parkingService.getAllSlots().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.parkingSlots.set(response.data);
          this.addParkingMarkers(response.data);
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading parking slots:', err);
        this.loading.set(false);
      }
    });
  }

  loadNearbySlots(lat: number, lng: number): void {
    this.parkingService.getNearbySlots(lat, lng, 10).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.parkingSlots.set(response.data);
          this.addParkingMarkers(response.data);
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading nearby slots:', err);
        this.loadParkingSlots();
      }
    });
  }

  addParkingMarkers(slots: ParkingSlot[]): void {
    // Skip if map is not loaded
    if (!this.map) {
      return;
    }

    // Clear existing markers
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    slots.forEach(slot => {
      const marker = new google.maps.Marker({
        position: { lat: slot.latitude, lng: slot.longitude },
        map: this.map,
        title: slot.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: this.getMarkerColor(slot),
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => {
        this.onMarkerClick(slot);
      });

      this.markers.push(marker);
    });
  }

  getMarkerColor(slot: ParkingSlot): string {
    const occupancy = parseFloat(slot.occupancy_percentage || '0');
    if (occupancy >= 90) return '#ef4444'; // Red
    if (occupancy >= 70) return '#f59e0b'; // Orange
    if (occupancy >= 50) return '#eab308'; // Yellow
    return '#10b981'; // Green
  }

  onMarkerClick(slot: ParkingSlot): void {
    this.selectedSlot.set(slot);
    if (this.map) {
      this.map.panTo({ lat: slot.latitude, lng: slot.longitude });
      this.map.setZoom(15);
    }
  }

  loadTrafficHeatmap(): void {
    // Skip if map is not loaded
    if (!this.map) {
      return;
    }

    this.trafficService.getTrafficHeatmap().subscribe({
      next: (response: any) => {
        if (response.success && response.data.length > 0 && this.map) {
          const heatmapData = response.data.map((item: any) => ({
            location: new google.maps.LatLng(item.latitude, item.longitude),
            weight: item.intensity || 0.5
          }));

          new google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: this.map,
            radius: 30,
            opacity: 0.6
          });
        }
      },
      error: (err: any) => console.error('Error loading heatmap:', err)
    });
  }

  openReportModal(slot: ParkingSlot): void {
    this.selectedSlot.set(slot);
    this.showReportModal.set(true);
  }

  submitReport(): void {
    const slot = this.selectedSlot();
    if (!slot) return;

    this.reportsService.submitReport(slot.id, this.reportType, `User reported ${this.reportType}`).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert('✅ Report submitted successfully! You earned 10 points.');
          this.showReportModal.set(false);
          this.loadParkingSlots();
        }
      },
      error: (err: any) => {
        alert('❌ Error submitting report: ' + (err.error?.message || 'Unknown error'));
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
