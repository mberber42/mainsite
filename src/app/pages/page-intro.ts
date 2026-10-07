import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-intro',
  standalone: true,
  template: `
    <header class="page-intro">
      <p class="eyebrow"><span class="eyebrow__mark" aria-hidden="true"></span>{{ eyebrow() }}</p>
      <h1>{{ title() }}</h1>
      <p class="page-intro__description">{{ description() }}</p>
    </header>
  `,
})
export class PageIntroComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
