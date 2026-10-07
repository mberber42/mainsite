import { Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PUBLIC_COPY } from '../content/public-content';
import { LocaleService } from '../i18n/locale.service';
import { PageIntroComponent } from './page-intro';

@Component({
  imports: [PageIntroComponent, ReactiveFormsModule],
  selector: 'app-contact-page',
  templateUrl: './templates/contact-page.html',
})
export class ContactPageComponent {
  private readonly localeService = inject(LocaleService);
  protected readonly locale = this.localeService.locale;
  protected readonly copy = computed(() => PUBLIC_COPY[this.locale()].contact);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected submitAttempted = false;
  protected validated = false;

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

  protected submit(): void {
    this.submitAttempted = true;
    this.validated = false;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    // Intentionally local-only in Phase 2: do not issue requests or persist form values.
    this.validated = true;
  }
}
