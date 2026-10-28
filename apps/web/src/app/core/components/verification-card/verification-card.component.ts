import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideShieldCheck } from '@ng-icons/lucide';
import {
  HlmCard,
  HlmCardDescription,
  HlmCardTitle
} from '@spartan-ng/helm/card';

/** Card that explains how transfers are verified. */
@Component({
  selector: 'app-verification-card',
  imports: [RouterLink, NgIcon, HlmCard, HlmCardTitle, HlmCardDescription],
  providers: [provideIcons({ lucideShieldCheck })],
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div hlmCard class="flex flex-row items-start gap-3 p-4">
      <ng-icon
        name="lucideShieldCheck"
        size="16px"
        class="mt-0.5 shrink-0 text-muted-foreground"
      />
      <div class="min-w-0 flex-1">
        <h3 hlmCardTitle>{{ title() }}</h3>
        <p hlmCardDescription class="mt-1">{{ description() }}</p>
        <a
          [routerLink]="linkRoute()"
          class="mt-2 block text-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-muted-foreground"
        >
          {{ linkText() }}
        </a>
      </div>
    </div>
  `
})
export class VerificationCardComponent {
  /** Card title. */
  readonly title = input.required<string>();
  /** Card body. */
  readonly description = input.required<string>();
  /** Text of the link at the bottom. */
  readonly linkText = input.required<string>();
  /** Route the link opens. */
  readonly linkRoute = input.required<string>();
}
