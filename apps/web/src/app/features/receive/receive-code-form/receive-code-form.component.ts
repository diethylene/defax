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

  /** True while the code input holds focus. */
  protected readonly focused = signal(false);

  /** The card scrolled to the top of the scroll container on focus. */
  private readonly card = viewChild<ElementRef<HTMLElement>>('card');

  /** Tears down the viewport resize subscription with the component. */
  private readonly destroyRef = inject(DestroyRef);

  /** Resets the field on disconnect and re-scrolls the card when the viewport resizes while focused. */
  constructor() {
    effect(() => {
      if (this.connecting()) return;
      this.model.set(emptyCode);
      this.submitted.set(false);
    });

    // The viewport resize fires after the on-screen keyboard opens, which moves the card off screen.
    const viewport: EventTarget = window.visualViewport ?? window;
    fromEvent(viewport, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.focused()) this.scrollCardToTop();
      });
  }

  /** Scrolls the main container so the card sits at its top with a 4px margin. */
  protected scrollCardToTop(): void {
    const card = this.card()?.nativeElement;
    if (card === undefined) return;
    // Deferred a frame so the browser's own focus scroll does not override this one.
    requestAnimationFrame(() => {
      const main = card.closest('main');
      if (main === null) return;
      const top =
        card.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 4;
      main.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
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
