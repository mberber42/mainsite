import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CmsApiService, type CmsMessage } from '../cms/cms-api.service';

@Component({
  imports: [DatePipe],
  selector: 'app-admin-messages',
  templateUrl: './admin-messages.html',
})
export class AdminMessagesComponent implements OnInit {
  private readonly api = inject(CmsApiService);
  protected readonly messages = signal<readonly CmsMessage[]>([]);
  protected readonly selected = signal<CmsMessage | null>(null);
  protected readonly showArchived = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected async open(message: CmsMessage): Promise<void> {
    this.error.set('');
    try {
      let detail = await this.api.get<CmsMessage>(`/api/admin/messages/${message.id}`);
      if (!detail.read_at) {
        const state = await this.api.mutate<{ read_at: string | null }>(
          'PATCH',
          `/api/admin/messages/${message.id}/read`,
          { read: true },
        );
        detail = { ...detail, read_at: state.read_at };
      }
      this.selected.set(detail);
      await this.load();
    } catch {
      this.error.set('Mesaj açılamadı.');
    }
  }

  protected async toggleArchive(message: CmsMessage): Promise<void> {
    try {
      const archived = !message.archived_at;
      await this.api.mutate('PATCH', `/api/admin/messages/${message.id}/archive`, { archived });
      this.notice.set(archived ? 'Mesaj arşivlendi.' : 'Mesaj arşivden çıkarıldı.');
      await this.load();
      if (this.selected()?.id === message.id)
        this.selected.update((current) =>
          current ? { ...current, archived_at: archived ? new Date().toISOString() : null } : null,
        );
    } catch {
      this.error.set('Mesajın arşiv durumu değiştirilemedi.');
    }
  }

  protected async remove(message: CmsMessage): Promise<void> {
    if (
      !globalThis.confirm(`${message.name} tarafından gönderilen mesaj kalıcı olarak silinsin mi?`)
    )
      return;
    try {
      await this.api.mutate<void>('DELETE', `/api/admin/messages/${message.id}`);
      if (this.selected()?.id === message.id) this.selected.set(null);
      this.notice.set('Mesaj silindi.');
      await this.load();
    } catch {
      this.error.set('Mesaj silinemedi.');
    }
  }

  protected async setArchivedView(value: boolean): Promise<void> {
    this.showArchived.set(value);
    this.selected.set(null);
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const suffix = this.showArchived() ? '?archived=true' : '';
      this.messages.set(await this.api.get<readonly CmsMessage[]>(`/api/admin/messages${suffix}`));
    } catch {
      this.error.set('Mesaj kutusu yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }
}
