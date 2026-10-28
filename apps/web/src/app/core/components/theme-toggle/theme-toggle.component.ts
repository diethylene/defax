import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { ApplicationConfigActions } from '../../../store/application-config/application-config.actions';
import { applicationConfigFeature } from '../../../store/application-config/application-config.reducer';

/** Button that switches between the light and dark themes. */
@Component({
  selector: 'app-theme-toggle',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideMoon, lucideSun })],
  host: { class: 'flex' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      hlmBtn
      variant="ghost"
      size="icon-xs"
      [attr.aria-label]="label()"
      (click)="toggle()"
    >
      <ng-icon [name]="icon()" size="16px" />
    </button>
  `,
})
export class ThemeToggleComponent {
  /** Global store. */
  private readonly store = inject(Store);

  /** Theme mode from the store. */
  private readonly mode = toSignal(this.store.select(applicationConfigFeature.selectMode), {
    initialValue: 'light',
  });

  /** Whether the dark theme is active. */
  protected readonly isDark = computed(() => this.mode() === 'dark');
  /** Icon that shows the theme the button switches to. */
  protected readonly icon = computed(() => (this.isDark() ? 'lucideSun' : 'lucideMoon'));
  /** Accessible label for the action the button performs. */
  protected readonly label = computed(() =>
    this.isDark() ? 'Switch to light mode' : 'Switch to dark mode',
  );

  /** Switches the theme mode. */
  protected toggle(): void {
    this.store.dispatch(ApplicationConfigActions.toggleMode());
  }
}
