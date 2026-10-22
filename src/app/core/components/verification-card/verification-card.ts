import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideShieldCheck } from '@ng-icons/lucide';
import {
  HlmCard,
  HlmCardDescription,
  HlmCardTitle
} from '@spartan-ng/helm/card';

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
export class VerificationCard {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly linkText = input.required<string>();
  readonly linkRoute = input.required<string>();
}
