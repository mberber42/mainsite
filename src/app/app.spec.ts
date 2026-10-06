import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('renders the Turkish home page by default', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('h1')?.textContent).toContain('Mustafa BERBER');
    expect(page.querySelector('[data-testid="hero-value"]')?.textContent).toContain(
      'Dijital ürünler',
    );
    expect(document.documentElement.lang).toBe('tr');
  });

  it('switches the home page to English and back to Turkish', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const englishButton = page.querySelector<HTMLButtonElement>(
      '[aria-label="İngilizce diline geç"]',
    );

    expect(englishButton).not.toBeNull();
    englishButton?.click();
    fixture.detectChanges();

    expect(page.querySelector('[data-testid="hero-value"]')?.textContent).toContain(
      'I build digital products',
    );
    expect(document.documentElement.lang).toBe('en');
    expect(
      page
        .querySelector<HTMLButtonElement>('[aria-label="Switch language to English"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');

    page.querySelector<HTMLButtonElement>('[aria-label="Switch language to Turkish"]')?.click();
    fixture.detectChanges();

    expect(page.querySelector('[data-testid="hero-value"]')?.textContent).toContain(
      'Dijital ürünler',
    );
    expect(document.documentElement.lang).toBe('tr');
  });
});
