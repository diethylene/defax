import { animate, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, FormField, form, submit, validate } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { ErrorStateMatcher } from '@spartan-ng/brain/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import * as Option from 'effect/Option';
import { fromEvent } from 'rxjs';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { NoSpacesDirective } from '../../../shared/directives/no-spaces.directive';
import { parseReceiveCode } from '../../../shared/utils/passcode.util';

/** Text the receive form edits. */
interface ReceiveCodeModel {
  /** Code typed or pasted by the user. */
  readonly code: string;
}

/** Empty form model. */
const emptyCode: ReceiveCodeModel = { code: '' };

/** Spartan flags invalid fields on touched or dirty by default; this suppresses that so errors wait for a submit. */
class NoopErrorStateMatcher extends ErrorStateMatcher {
  /**
   * Reports every field as valid to the error state matcher.
   * @returns Always false.
   */
  override isInvalid(): boolean {
    return false;
  }
}

/** Grows the connecting panel from nothing. */
const grow = trigger('grow', [
  transition(':enter', [
    style({ opacity: 0, height: 0 }),
    animate('200ms ease-out', style({ opacity: 1, height: '*' })),
  ]),
  transition(':leave', [animate('200ms ease-out', style({ opacity: 0, height: 0 }))]),
]);

/** Pops the valid-code check mark in and out. */
const check = trigger('check', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.5)' }),
    animate('150ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
  ]),
  transition(':leave', [animate('120ms ease-out', style({ opacity: 0, transform: 'scale(0.5)' }))]),
]);

/** Collects the code from the sender and emits it once it parses. */
@Component({
  selector: 'app-receive-code-form',
  imports: [
    FormField,
    NgIcon,
    NoSpacesDirective,
    SpinnerComponent,
    HlmButton,
    HlmCard,
    HlmCardContent,
    HlmInput,
    HlmLabel,
    HlmSeparator,
  ],
  providers: [
    provideIcons({ lucideCheck }),
    { provide: ErrorStateMatcher, useClass: NoopErrorStateMatcher },
  ],
  animations: [grow, check],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './receive-code-form.component.html',
})
export class ReceiveCodeFormComponent {
  /** Emits the parsed code when the user connects. */
  readonly connect = output<string>();
  /** True while the receive is connecting. */
  readonly connecting = input(false);

  /** Form model; the form writes straight into it. */
  private readonly model = signal<ReceiveCodeModel>(emptyCode);

  /** Code field, validated by the receive code parser and disabled while connecting. */
  protected readonly codeForm = form(this.model, (path) => {
    validate(path.code, (ctx) => {
      const value = ctx.value();
      return value.trim().length === 0 || Option.isSome(parseReceiveCode(value))
        ? null
        : { kind: 'receiveCode' };
    });
    disabled(path.code, { when: () => this.connecting() });
  });

  /** True after a submit attempt, so errors wait for one. */
  protected readonly submitted = signal(false);

  /** True when the field holds non-blank text. */
  protected readonly hasText = computed(() => this.codeForm.code().value().trim().length > 0);

  /** True when the field holds non-blank text that parses. */
  protected readonly valid = computed(() => this.hasText() && this.codeForm.code().valid());

  /** True when a submitted code failed to parse. */
  protected readonly showError = computed(() => this.submitted() && this.codeForm.code().invalid());

  /** The card scrolled to the top of the viewport when the keyboard opens. */
  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  /** Tear-down scope for the viewport resize listener. */
  private readonly destroyRef = inject(DestroyRef);
  /** True while the code input holds focus. */
  protected readonly focused = signal(false);

  /** Resets the field on disconnect and scrolls the card clear of the keyboard while focused. */
  constructor() {
    effect(() => {
      if (this.connecting()) return;
      this.model.set(emptyCode);
      this.submitted.set(false);
    });

    const viewport: EventTarget = window.visualViewport ?? window;
    fromEvent(viewport, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.scrollCardIntoView());
  }

  /**
   * Scrolls the card to the top of its scroll container when the keyboard opens.
   */
  private scrollCardIntoView(): void {
    if (!this.focused()) return;
    this.card()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Submits the form and emits the parsed code when it is valid.
   * @param event The native submit event, cancelled so the page does not reload.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    // async: signal forms' submit() requires the action to return a Promise.
    void submit(this.codeForm, async () => {
      Option.match(parseReceiveCode(this.model().code), {
        onSome: ({ roomId, password }) => this.connect.emit(`${roomId}-${password}`),
        onNone: () => undefined,
      });
    });
  }
}
