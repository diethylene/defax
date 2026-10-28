import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideUpload } from '@ng-icons/lucide';
import type { NavItem } from './nav-item.model';
import { NavComponent } from './nav.component';

/** Links shared by the nav tests. */
const items: NavItem[] = [
  { label: 'Send', route: '/send', icon: 'lucideUpload' },
  { label: 'Receive', route: '/receive', icon: 'lucideDownload' }
];

describe('NavComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavComponent],
      providers: [
        provideRouter([]),
        provideIcons({ lucideUpload, lucideDownload })
      ]
    }).compileComponents();
  });

  /**
   * Renders the nav for one active route.
   * @param activeRoute Route the nav should treat as current.
   * @returns Rendered host element.
   */
  function render(activeRoute: string): HTMLElement {
    const fixture = TestBed.createComponent(NavComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('activeRoute', activeRoute);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('renders a link per item', () => {
    const element = render('/send');
    expect(element.querySelectorAll('a').length).toBe(2);
  });

  it('marks the active item with aria-current and the muted pill', () => {
    const element = render('/send');
    const active = element.querySelector('a[aria-current="page"]');
    expect(active?.textContent).toContain('Send');
    expect(active?.className).toContain('bg-muted');
  });

  it('clears active state when no route matches', () => {
    const element = render('/unknown');
    expect(element.querySelector('a[aria-current="page"]')).toBeNull();
  });
});
