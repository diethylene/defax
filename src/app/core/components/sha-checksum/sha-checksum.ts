import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';

const GROUP_SIZE = 4;
const GROUP_COUNT = 16;

@Component({
  selector: 'app-sha-checksum',
  imports: [NgIcon, HlmButton, HlmSkeleton],
  providers: [provideIcons({ lucideCopy })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start gap-6">
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <span class="text-sm text-muted-foreground">SHA-256 checksum</span>

        @if (checksum()) {
          <div
            class="flex flex-wrap gap-x-2 gap-y-1 font-mono text-sm text-foreground"
          >
            @for (group of groups(); track $index) {
              <span>{{ group }}</span>
            }
          </div>
        } @else {
          <div class="flex flex-wrap gap-2">
            @for (group of skeletonGroups; track $index) {
              <hlm-skeleton class="h-5 w-8" />
            }
          </div>
        }
      </div>

      <button
        type="button"
        hlmBtn
        variant="ghost"
        size="icon"
        aria-label="Copy checksum"
        class="shrink-0"
      >
        <ng-icon name="lucideCopy" size="16" />
      </button>
    </div>
  `
})
export class ShaChecksumComponent {
  readonly checksum = input.required<string | null>();

  protected readonly groups = computed(() =>
    chunk(this.checksum() ?? '', GROUP_SIZE)
  );

  protected readonly skeletonGroups = Array.from({ length: GROUP_COUNT });
}

function chunk(value: string, size: number): string[] {
  const groups: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    groups.push(value.slice(i, i + size));
  }
  return groups;
}
