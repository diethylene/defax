import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { Store } from '@ngrx/store';
import { HlmButton } from '@spartan-ng/helm/button';
import { toggleMode } from '../../../store/actions/application-config.actions';
import { selectMode } from '../../../store/selectors/application-config.selectors';

@Component({
  selector: 'app-theme-toggle',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideMoon, lucideSun })],
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
      <ng-icon [name]="isDark() ? 'lucideSun' : 'lucideMoon'" size="16px" />
    </button>
  `
})
export class ThemeToggle {
  private readonly store = inject(Store);

  private readonly mode = toSignal(this.store.select(selectMode), {
    initialValue: 'light'
  });

  protected readonly isDark = computed(() => this.mode() === 'dark');
  protected readonly label = computed(() =>
    this.isDark() ? 'Switch to light mode' : 'Switch to dark mode'
  );

  protected toggle(): void {
    this.store.dispatch(toggleMode());
  }
}
