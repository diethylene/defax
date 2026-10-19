import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { HlmSkeleton } from '@spartan-ng/helm/skeleton';
import type { Identity } from '../../../shared/interfaces/identity';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';
import { chunk } from '../../../shared/utilities/chunk';

export interface FileSummary {
  name: string;
  size: number;
}

const GROUP_SIZE = 4;
const SKELETON_GROUPS = 16;

@Component({
  selector: 'app-fingerprint-card',
  imports: [FileSizePipe, HlmSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="flex flex-col text-sm">
      @for (row of rows(); track row.label) {
        <div
          class="flex items-center justify-between gap-4 border-b border-border py-3"
        >
          <dt class="shrink-0 text-muted-foreground">{{ row.label }}</dt>
          <dd class="min-w-0 truncate text-right font-medium text-foreground">
            {{ row.value }}
          </dd>
        </div>
      }
      <div
        class="flex items-center justify-between gap-4 border-b border-border py-3"
      >
        <dt class="shrink-0 text-muted-foreground">File</dt>
        <dd
          class="flex min-w-0 items-center justify-end gap-1.5 font-medium text-foreground"
        >
          @if (file(); as f) {
            <span class="min-w-0 truncate">{{ f.name }}</span>
            <span class="shrink-0" aria-hidden="true">·</span>
            <span class="shrink-0">{{ f.size | fileSize }}</span>
          }
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4 py-3">
        <dt class="shrink-0 text-muted-foreground">SHA-256</dt>
        <dd class="min-w-0 text-right font-medium text-foreground">
          @if (checksum()) {
            <div class="flex flex-wrap justify-end gap-x-2 gap-y-1 font-mono">
              @for (group of checksumGroups(); track $index) {
                <span>{{ group }}</span>
              }
            </div>
          } @else {
            <div class="flex flex-wrap justify-end gap-2">
              @for (group of skeletonGroups; track $index) {
                <hlm-skeleton class="h-5 w-8" />
              }
            </div>
          }
        </dd>
      </div>
    </dl>
  `
})
export class FingerprintCardComponent {
  readonly identity = input.required<Identity | null>();
  readonly file = input.required<FileSummary | null>();
  readonly checksum = input<string | null>(null);

  protected readonly rows = computed(() => {
    const identity = this.identity();
    return [
      { label: 'Browser', value: identity?.browser ?? '' },
      { label: 'Operating system', value: identity?.os ?? '' },
      {
        label: 'Location',
        value: identity ? locationFromTimeZone(identity.timeZone) : ''
      },
      { label: 'Language', value: identity?.language ?? '' }
    ];
  });

  protected readonly checksumGroups = computed(() =>
    chunk(this.checksum() ?? '', GROUP_SIZE)
  );

  protected readonly skeletonGroups = Array.from({ length: SKELETON_GROUPS });
}

function locationFromTimeZone(timeZone: string): string {
  const region = timeZone.split('/')[0];
  return region && region !== 'Etc' ? region : timeZone;
}
