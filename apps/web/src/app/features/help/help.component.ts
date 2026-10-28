import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HowItWorksCardComponent } from '../../core/components/how-it-works-card/how-it-works-card.component';
import { ListCardComponent } from '../../core/components/list-card/list-card.component';
import { PageShellComponent } from '../../core/components/page-shell/page-shell.component';
import { VerificationCardComponent } from '../../core/components/verification-card/verification-card.component';

/** Content of one help list card. */
interface ListCardData {
  /** Card heading. */
  title: string;
  /** Lines listed under the heading. */
  items: string[];
}

/** Explains how a transfer works and what the server can see. */
@Component({
  selector: 'app-help',
  imports: [
    PageShellComponent,
    HowItWorksCardComponent,
    ListCardComponent,
    VerificationCardComponent
  ],
  host: { class: 'page-transition block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help.component.html'
})
export class HelpComponent {
  /** Server visibility cards shown at the bottom. */
  protected readonly serverCards: ListCardData[] = [
    {
      title: 'What our server sees',
      items: [
        'That two devices connected, and when',
        'Their network addresses',
        'The number at the start of the code'
      ]
    },
    {
      title: 'What it never sees',
      items: [
        'The file, its name, or its type',
        'The words in your code',
        'The encryption key'
      ]
    }
  ];
}
