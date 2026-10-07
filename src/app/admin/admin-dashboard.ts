import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CmsApiService, type CmsDashboard } from '../cms/cms-api.service';

@Component({
  imports: [DatePipe, RouterLink],
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(CmsApiService);
  protected readonly dashboard = signal<CmsDashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.dashboard.set(await this.api.get<CmsDashboard>('/api/admin/dashboard'));
    } catch {
      this.error.set('Dashboard verileri yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
    } finally {
      this.loading.set(false);
    }
  }
}
