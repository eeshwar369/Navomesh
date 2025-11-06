import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReportsService } from '../../services/reports.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <nav class="bg-white shadow-md mb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900">📊 My Reports</h1>
            </div>
            <div class="flex items-center space-x-4">
              <a routerLink="/dashboard" class="text-blue-600 hover:text-blue-800">Dashboard</a>
            </div>
          </div>
        </div>
      </nav>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        @if (loading()) {
          <div class="flex justify-center py-8">
            <div class="spinner"></div>
          </div>
        } @else {
          <div class="grid gap-4">
            @for (report of reports(); track report.id) {
              <div class="card">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-semibold text-lg">{{ report.slot_name }}</h3>
                    <p class="text-sm text-gray-600">{{ report.slot_location }}</p>
                    <p class="text-sm mt-2">Type: <strong>{{ report.report_type }}</strong></p>
                  </div>
                  <span 
                    class="px-3 py-1 rounded text-sm font-medium"
                    [class.bg-green-100]="report.status === 'verified'"
                    [class.text-green-800]="report.status === 'verified'"
                    [class.bg-yellow-100]="report.status === 'pending'"
                    [class.text-yellow-800]="report.status === 'pending'"
                    [class.bg-red-100]="report.status === 'rejected'"
                    [class.text-red-800]="report.status === 'rejected'"
                  >
                    {{ report.status }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mt-2">{{ report.timestamp | date:'medium' }}</p>
              </div>
            } @empty {
              <p class="text-center text-gray-600 py-8">No reports yet. Start reporting parking status to earn points!</p>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: []
})
export class ReportsComponent implements OnInit {
  reports = signal<any[]>([]);
  loading = signal(true);

  constructor(
    private reportsService: ReportsService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.reportsService.getUserReports().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.reports.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
