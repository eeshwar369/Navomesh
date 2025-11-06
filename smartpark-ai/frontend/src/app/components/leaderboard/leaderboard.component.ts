import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReportsService } from '../../services/reports.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <nav class="bg-white shadow-md mb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900">🏆 Leaderboard</h1>
            </div>
            <div class="flex items-center space-x-4">
              <a routerLink="/dashboard" class="text-blue-600 hover:text-blue-800">Dashboard</a>
            </div>
          </div>
        </div>
      </nav>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        @if (loading()) {
          <div class="flex justify-center py-8">
            <div class="spinner"></div>
          </div>
        } @else {
          <div class="card">
            <h2 class="text-xl font-bold mb-6">Top Contributors</h2>
            <div class="space-y-4">
              @for (user of leaderboard(); track user.id; let idx = $index) {
                <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div 
                    class="text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-full"
                    [class.bg-yellow-400]="idx === 0"
                    [class.text-yellow-900]="idx === 0"
                    [class.bg-gray-300]="idx === 1"
                    [class.text-gray-900]="idx === 1"
                    [class.bg-orange-400]="idx === 2"
                    [class.text-orange-900]="idx === 2"
                    [class.bg-blue-100]="idx > 2"
                    [class.text-blue-900]="idx > 2"
                  >
                    {{ idx + 1 }}
                  </div>
                  <div class="flex-1">
                    <h3 class="font-semibold text-lg">{{ user.name }}</h3>
                    <div class="flex space-x-4 text-sm text-gray-600">
                      <span>📝 {{ user.total_reports }} reports</span>
                      <span>✅ {{ user.verified_reports }} verified</span>
                      <span class="font-medium text-blue-600">{{ user.level }}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-2xl font-bold text-blue-600">{{ user.points }}</p>
                    <p class="text-xs text-gray-500">points</p>
                  </div>
                </div>
              } @empty {
                <p class="text-center text-gray-600 py-8">No contributors yet</p>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: []
})
export class LeaderboardComponent implements OnInit {
  leaderboard = signal<any[]>([]);
  loading = signal(true);

  constructor(private reportsService: ReportsService) {}

  ngOnInit(): void {
    this.reportsService.getLeaderboard().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.leaderboard.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
