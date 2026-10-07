import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CmsApiService } from '../cms/cms-api.service';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const api = inject(CmsApiService);
  const router = inject(Router);
  try {
    const session = await api.session();
    return session.authenticated
      ? true
      : router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
  } catch {
    return router.createUrlTree(['/admin/login']);
  }
};
