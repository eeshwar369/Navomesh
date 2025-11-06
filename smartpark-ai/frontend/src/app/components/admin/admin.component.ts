import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ReportsService } from '../../services/reports.service';

Chart.register(...registerables);

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  analytics = signal<any>(null);
  loading = signal(true);
  charts: any = {};

  constructor(
    public authService: AuthService,
    private adminService: AdminService,
    private reportsService: ReportsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.adminService.getDashboardAnalytics().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.analytics.set(response.data);
          setTimeout(() => this.initializeCharts(), 100);
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading analytics:', err);
        this.loading.set(false);
      }
    });
  }

  initializeCharts(): void {
    const analytics = this.analytics();
    if (!analytics) return;

    // Parking occupancy chart
    const parkingCtx = document.getElementById('parkingChart') as HTMLCanvasElement;
    if (parkingCtx && analytics.parking?.by_area) {
      this.charts.parking = new Chart(parkingCtx, {
        type: 'bar',
        data: {
          labels: analytics.parking.by_area.map((a: any) => a.area),
          datasets: [{
            label: 'Occupancy Rate (%)',
            data: analytics.parking.by_area.map((a: any) => a.occupancy_rate),
            backgroundColor: '#3b82f6'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    }

    // Traffic congestion chart
    const trafficCtx = document.getElementById('trafficChart') as HTMLCanvasElement;
    if (trafficCtx && analytics.traffic?.by_congestion_level) {
      this.charts.traffic = new Chart(trafficCtx, {
        type: 'doughnut',
        data: {
          labels: analytics.traffic.by_congestion_level.map((t: any) => t.congestion_level),
          datasets: [{
            data: analytics.traffic.by_congestion_level.map((t: any) => t.count),
            backgroundColor: ['#10b981', '#eab308', '#f59e0b', '#ef4444']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    // Reports chart
    const reportsCtx = document.getElementById('reportsChart') as HTMLCanvasElement;
    if (reportsCtx && analytics.reports?.by_status) {
      this.charts.reports = new Chart(reportsCtx, {
        type: 'pie',
        data: {
          labels: analytics.reports.by_status.map((r: any) => r.status),
          datasets: [{
            data: analytics.reports.by_status.map((r: any) => r.count),
            backgroundColor: ['#10b981', '#3b82f6', '#ef4444']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
