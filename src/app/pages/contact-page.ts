import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { PUBLIC_COPY } from '../content/public-content';
import { LocaleService } from '../i18n/locale.service';
import { CmsApiService } from '../cms/cms-api.service';
import { SeoMetadataService } from '../cms/seo-metadata.service';
import { PageIntroComponent } from './page-intro';

const trimmedRequired: ValidatorFn = (control) => {
  if (typeof control.value !== 'string' || control.value.trim().length === 0) {
    return { required: true };
  }
  return null;
};

@Component({
  imports: [PageIntroComponent, ReactiveFormsModule],
  selector: 'app-contact-page',
  templateUrl: './templates/contact-page.html',
})
export class ContactPageComponent {
  private readonly localeService = inject(LocaleService);
  private readonly cmsApi = inject(CmsApiService);
  private readonly seo = inject(SeoMetadataService);
  private readonly seoEntry = toSignal(this.cmsApi.entry('seo', 'contact'), { initialValue: null });
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].contact);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [trimmedRequired] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [trimmedRequired, Validators.email],
    }),
    message: new FormControl('', { nonNullable: true, validators: [trimmedRequired] }),
  });
  protected submitAttempted = false;
  protected readonly sending = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitError = signal(false);

  constructor() {
    effect(() =>
      this.seo.applyEntry(
        this.seoEntry(),
        this.locale(),
        `${this.copy().title} | Mustafa BERBER`,
        this.copy().description,
      ),
    );
  }

  protected errorMessage(field: 'name' | 'email' | 'message'): string {
    const control = this.form.controls[field];
    if (!control.touched && !this.submitAttempted) {
      return '';
    }
    if (control.hasError('required')) {
      return field === 'name'
        ? this.copy().nameRequired
        : field === 'email'
          ? this.copy().emailRequired
          : this.copy().messageRequired;
    }
    if (field === 'email' && control.hasError('email')) {
      return this.copy().emailInvalid;
    }
    return '';
  }

  protected async submit(): Promise<void> {
    this.submitAttempted = true;
    this.submitted.set(false);
    this.submitError.set(false);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.sending.set(true);
    try {
      const { name, email, message } = this.form.getRawValue();
      await this.cmsApi.mutate<{ id: string }>('POST', '/api/public/contact', {
        name,
        email,
        message,
      });
      this.form.reset({ name: '', email: '', message: '' });
      this.submitAttempted = false;
      this.submitted.set(true);
    } catch {
      this.submitError.set(true);
    } finally {
      this.sending.set(false);
    }
  }
}
