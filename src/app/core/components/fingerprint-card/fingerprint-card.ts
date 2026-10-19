import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import type { Identity } from '../../../shared/interfaces/identity';
import { FileSizePipe } from '../../../shared/pipes/file-size.pipe';

export interface FileSummary {
  name: string;
  size: number;
}

@Component({
  selector: 'app-fingerprint-card',
  imports: [FileSizePipe],
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
      <div class="flex items-center justify-between gap-4 py-3">
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
    </dl>
  `
})
export class FingerprintCardComponent {
  readonly identity = input.required<Identity | null>();
  readonly file = input.required<FileSummary | null>();

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
}

function locationFromTimeZone(timeZone: string): string {
  const region = timeZone.split('/')[0];
  return region && region !== 'Etc' ? region : timeZone;
}
