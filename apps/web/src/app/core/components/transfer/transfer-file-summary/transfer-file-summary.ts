import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFile } from '@ng-icons/lucide';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';

@Component({
  selector: 'app-transfer-file-summary',
  imports: [NgIcon, FileSizePipe, DurationPipe],
  providers: [provideIcons({ lucideFile })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-4">
      <div
        class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      >
        <ng-icon name="lucideFile" size="24" />
      </div>

      <div class="min-w-0 flex-1">
        <h2
          class="truncate text-base font-semibold tracking-tight text-foreground"
        >
          {{ name() }}
        </h2>
        <p class="truncate text-sm text-muted-foreground">
          @if (size(); as value) {
            <span>{{ value | fileSize }}</span>
            <span aria-hidden="true">·</span>
          }
          <span>To {{ peerBrowser() }} on {{ peerOs() }}</span>
          @if (timeTaken(); as value) {
            <span aria-hidden="true">·</span>
            <span>{{ value | duration }}</span>
          }
        </p>
      </div>

      <ng-content select="[trailing]" />
    </div>
  `
})
export class TransferFileSummaryComponent {
  readonly name = input.required<string>();
  readonly size = input<number | null>(null);
  readonly peerBrowser = input('');
  readonly peerOs = input('');
  readonly timeTaken = input<number | null>(null);
}
