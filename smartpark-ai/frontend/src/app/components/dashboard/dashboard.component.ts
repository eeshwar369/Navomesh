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
  trafficMarkers: google.maps.Marker[] = [];
  trafficCircles: google.maps.Circle[] = [];
  userMarker!: google.maps.Marker;
  
  parkingSlots = signal<ParkingSlot[]>([]);
  selectedSlot = signal<ParkingSlot | null>(null);
  userLocation = signal<{ lat: number; lng: number } | null>(null);
  loading = signal(true);
  showReportModal = signal(false);
  reportType = 'available';
  
  // Traffic prediction state
  showTrafficPredictions = signal(true);
  trafficZones = signal<any[]>([]);
  selectedTrafficZone = signal<any>(null);
  showTrafficInfo = signal(false);

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
    // Auto-load demo traffic zones after 2 seconds if no location
    setTimeout(() => {
      if (this.showTrafficPredictions() && this.trafficZones().length === 0) {
        console.log('🎯 Auto-loading DEMO traffic zones');
        this.loadDemoTrafficZones();
      }
    }, 2000);
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

  loadGeoDataLayers(): void {
    if (this.userLocation() && this.showTrafficPredictions()) {
      this.loadTrafficPredictions();
    }
  }

  // DEMO MODE: Load hardcoded traffic zones if API fails
  loadDemoTrafficZones(): void {
    const demoZones = [
      {
        zone: {
          id: 1,
          name: 'Bandra West Junction',
          code: 'BWJ-001',
          latitude: 19.0596,
          longitude: 72.8295,
          radius: 500,
          area: 'Bandra',
          distance: '2.5'
        },
        prediction: {
          predicted_congestion: 'high',
          predicted_speed: 18.5,
          predicted_vehicle_count: 480,
          confidence_score: 0.88,
          intensity: 0.8,
          color: '#ff8800'
        }
      },
      {
        zone: {
          id: 2,
          name: 'Andheri Link Road',
          code: 'ALR-002',
          latitude: 19.1136,
          longitude: 72.8697,
          radius: 600,
          area: 'Andheri',
          distance: '3.2'
        },
        prediction: {
          predicted_congestion: 'critical',
          predicted_speed: 12.2,
          predicted_vehicle_count: 580,
          confidence_score: 0.92,
          intensity: 1.0,
          color: '#ff0000'
        }
      },
      {
        zone: {
          id: 3,
          name: 'Lower Parel Flyover',
          code: 'LPF-003',
          latitude: 18.9988,
          longitude: 72.8299,
          radius: 450,
          area: 'Lower Parel',
          distance: '5.8'
        },
        prediction: {
          predicted_congestion: 'high',
          predicted_speed: 19.8,
          predicted_vehicle_count: 450,
          confidence_score: 0.85,
          intensity: 0.8,
          color: '#ff8800'
        }
      },
      {
        zone: {
          id: 4,
          name: 'Dadar TT Junction',
          code: 'DTT-004',
          latitude: 19.0176,
          longitude: 72.8485,
          radius: 550,
          area: 'Dadar',
          distance: '4.1'
        },
        prediction: {
          predicted_congestion: 'medium',
          predicted_speed: 28.5,
          predicted_vehicle_count: 320,
          confidence_score: 0.87,
          intensity: 0.5,
          color: '#ffff00'
        }
      },
      {
        zone: {
          id: 5,
          name: 'Worli Sea Link Entry',
          code: 'WSL-005',
          latitude: 19.0176,
          longitude: 72.8170,
          radius: 400,
          area: 'Worli',
          distance: '6.2'
        },
        prediction: {
          predicted_congestion: 'low',
          predicted_speed: 45.2,
          predicted_vehicle_count: 180,
          confidence_score: 0.90,
          intensity: 0.2,
          color: '#00ff00'
        }
      },
      {
        zone: {
          id: 6,
          name: 'BKC Junction',
          code: 'BKC-011',
          latitude: 19.0644,
          longitude: 72.8687,
          radius: 500,
          area: 'BKC',
          distance: '3.5'
        },
        prediction: {
          predicted_congestion: 'critical',
          predicted_speed: 15.2,
          predicted_vehicle_count: 520,
          confidence_score: 0.89,
          intensity: 1.0,
          color: '#ff0000'
        }
      },
      {
        zone: {
          id: 7,
          name: 'Santacruz Airport Road',
          code: 'SAR-013',
          latitude: 19.0896,
          longitude: 72.8656,
          radius: 550,
          area: 'Santacruz',
          distance: '1.8'
        },
        prediction: {
          predicted_congestion: 'critical',
          predicted_speed: 13.5,
          predicted_vehicle_count: 540,
          confidence_score: 0.93,
          intensity: 1.0,
          color: '#ff0000'
        }
      },
      {
        zone: {
          id: 8,
          name: 'Powai Junction',
          code: 'POW-006',
          latitude: 19.1168,
          longitude: 72.9050,
          radius: 500,
          area: 'Powai',
          distance: '7.5'
        },
        prediction: {
          predicted_congestion: 'medium',
          predicted_speed: 32.5,
          predicted_vehicle_count: 290,
          confidence_score: 0.84,
          intensity: 0.5,
          color: '#ffff00'
        }
      }
    ];

    console.log('🎯 DEMO MODE: Loading geo-tagged traffic zones');
    this.trafficZones.set(demoZones);
    this.addTrafficPredictionMarkers(demoZones);
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

          // Load nearby slots and traffic predictions
          this.loadNearbySlots(userPos.lat, userPos.lng);
          this.loadGeoDataLayers();
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

  loadTrafficPredictions(): void {
    const userLoc = this.userLocation();
    if (!this.map) {
      // If no map yet, try demo mode
      setTimeout(() => this.loadDemoTrafficZones(), 1000);
      return;
    }

    if (!userLoc) {
      console.log('⚠️ No user location, using DEMO MODE with Mumbai center');
      this.loadDemoTrafficZones();
      return;
    }

    this.trafficService.getGeoTaggedPredictions(userLoc.lat, userLoc.lng, 10).subscribe({
      next: (response: any) => {
        if (response.success && response.data && response.data.length > 0) {
          console.log('✅ Loaded real traffic predictions from API');
          this.trafficZones.set(response.data);
          this.addTrafficPredictionMarkers(response.data);
        } else {
          console.log('⚠️ No API data, falling back to DEMO MODE');
          this.loadDemoTrafficZones();
        }
      },
      error: (err: any) => {
        console.log('⚠️ API Error, using DEMO MODE:', err);
        this.loadDemoTrafficZones();
      }
    });
  }

  addTrafficPredictionMarkers(predictions: any[]): void {
    if (!this.map) return;

    // Clear existing traffic markers and circles
    this.trafficMarkers.forEach(marker => marker.setMap(null));
    this.trafficCircles.forEach(circle => circle.setMap(null));
    this.trafficMarkers = [];
    this.trafficCircles = [];

    predictions.forEach(item => {
      const zone = item.zone;
      const prediction = item.prediction;
      
      // Create circle to show traffic zone coverage
      const circle = new google.maps.Circle({
        center: { lat: zone.latitude, lng: zone.longitude },
        radius: zone.radius || 500,
        map: this.map,
        fillColor: prediction.color,
        fillOpacity: 0.15,
        strokeColor: prediction.color,
        strokeOpacity: 0.4,
        strokeWeight: 2
      });

      // Create marker for traffic zone
      const marker = new google.maps.Marker({
        position: { lat: zone.latitude, lng: zone.longitude },
        map: this.map,
        title: zone.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: prediction.color,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        label: {
          text: this.getTrafficIcon(prediction.predicted_congestion),
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: 'bold'
        }
      });

      marker.addListener('click', () => {
        this.onTrafficZoneClick(item);
      });

      this.trafficMarkers.push(marker);
      this.trafficCircles.push(circle);
    });
  }

  getTrafficIcon(congestionLevel: string): string {
    const iconMap: { [key: string]: string } = {
      'low': '✓',
      'medium': '⚠',
      'high': '⚠',
      'critical': '✖'
    };
    return iconMap[congestionLevel] || '•';
  }

  onTrafficZoneClick(zoneData: any): void {
    this.selectedTrafficZone.set(zoneData);
    this.showTrafficInfo.set(true);
    
    if (this.map) {
      this.map.panTo({ 
        lat: zoneData.zone.latitude, 
        lng: zoneData.zone.longitude 
      });
      this.map.setZoom(14);
    }
  }

  toggleTrafficPredictions(): void {
    const show = !this.showTrafficPredictions();
    this.showTrafficPredictions.set(show);

    if (show) {
      this.loadTrafficPredictions();
    } else {
      // Hide traffic markers and circles
      this.trafficMarkers.forEach(marker => marker.setMap(null));
      this.trafficCircles.forEach(circle => circle.setMap(null));
    }
  }

  closeTrafficInfo(): void {
    this.showTrafficInfo.set(false);
    this.selectedTrafficZone.set(null);
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

  openAdvancedModel(): void {
    // Open advanced model in new tab
    window.open('https://navonmesh-2025.vercel.app/', '_blank');
  }
}
