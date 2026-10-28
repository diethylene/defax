import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import { CopyButtonComponent } from '../../../shared/components/copy-button/copy-button.component';
import { chunk } from '../../../shared/utilities/chunk';

/** Digits shown per checksum group. */
const GROUP_SIZE = 4;

/** Placeholder groups shown while the checksum is unknown. */
const GROUP_COUNT = 16;

/** Shows a SHA-256 checksum with a copy button and a loading state. */
@Component({
  selector: 'app-sha-checksum',
  imports: [CopyButtonComponent, HlmSkeleton],
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

      <app-copy-button
        [value]="checksum() ?? ''"
        variant="ghost"
        label=""
        ariaLabel="Copy checksum"
        [disabled]="!checksum()"
        class="shrink-0"
      />
    </div>
  `
})
export class ShaChecksumComponent {
  /** Checksum to show, or none while the file is still hashing. */
  readonly checksum = input.required<string | undefined>();

  /** Checksum split into readable groups. */
  protected readonly groups = computed(() =>
    chunk(this.checksum() ?? '', GROUP_SIZE)
  );

  /** Placeholder widths shown while the checksum is unknown. */
  protected readonly skeletonGroups = Array.from({ length: GROUP_COUNT });
}
