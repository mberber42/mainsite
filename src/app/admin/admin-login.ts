import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CmsApiService } from '../cms/cms-api.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-admin-login',
  templateUrl: './admin-login.html',
})
export class AdminLoginComponent {
  private readonly api = inject(CmsApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected async submit(): Promise<void> {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.api.login(email, password);
      this.form.controls.password.setValue('');
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(
        returnUrl?.startsWith('/admin/') ? returnUrl : '/admin/dashboard',
      );
    } catch {
      this.error.set('E-posta veya parola geçersiz; giriş yapılamadı.');
      this.form.controls.password.setValue('');
    } finally {
      this.busy.set(false);
    }
  }
}
