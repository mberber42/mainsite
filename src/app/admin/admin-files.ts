import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CmsApiService } from '../cms/cms-api.service';

interface StoredFile {
  id: string;
  original_name: string;
  media_type: string;
  size_bytes: number;
  purpose: 'image' | 'cv';
  created_at: string;
}

@Component({
  imports: [DatePipe],
  selector: 'app-admin-files',
  templateUrl: './admin-files.html',
})
export class AdminFilesComponent implements OnInit {
  private readonly api = inject(CmsApiService);
  protected readonly files = signal<readonly StoredFile[]>([]);
  protected readonly cv = signal<StoredFile | null>(null);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected async uploadCv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    this.uploading.set(true);
    try {
      await this.api.upload('/api/admin/files/cv', file);
      this.notice.set(
        'CV PDF’si yerel depolamaya yüklendi ve public indirme bağlantısı güncellendi.',
      );
      await this.load();
    } catch {
      this.error.set('CV yüklenemedi. PDF kullanın; dosya boyutu 8 MB’ı aşmamalı.');
    } finally {
      input.value = '';
      this.uploading.set(false);
    }
  }

  protected async remove(file: StoredFile): Promise<void> {
    if (!globalThis.confirm(`${file.original_name} dosyası silinsin mi?`)) return;
    try {
      await this.api.mutate<void>('DELETE', `/api/admin/files/${file.id}`);
      this.notice.set('Dosya silindi.');
      await this.load();
    } catch {
      this.error.set(
        'Dosya silinemedi. İçerik tarafından kullanılıyorsa önce bağlantıyı kaldırın.',
      );
    }
  }

  protected publicUrl(file: StoredFile): string {
    return `/api/public/files/${file.id}`;
  }

  protected sizeLabel(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.ceil(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const files = await this.api.get<readonly StoredFile[]>('/api/admin/files');
      this.files.set(files);
      this.cv.set(files.find((file) => file.purpose === 'cv') ?? null);
    } catch {
      this.error.set('Dosya bilgileri yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }
}
