import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState
} from '@ngrx/signals';
import type {
  DragState,
  DropzoneInteraction,
  DropzonePhase,
  DropzoneResult,
  RejectedFile
} from './dropzone.model';

interface DropzoneStoreState {
  interaction: DropzoneInteraction;
  dragState: DragState;
  disabled: boolean;
  files: File[];
  error: RejectedFile[] | null;
}

const initialState: DropzoneStoreState = {
  interaction: 'idle',
  dragState: null,
  disabled: false,
  files: [],
  error: null
};

export const DropzoneStore = signalStore(
  withState(initialState),
  withComputed((store) => ({
    phase: computed<DropzonePhase>(() =>
      store.disabled() ? 'disabled' : store.interaction()
    )
  })),
  withMethods((store) => ({
    setInteraction(interaction: DropzoneInteraction): void {
      patchState(store, { interaction });
    },
    setDragState(dragState: DragState): void {
      patchState(store, { dragState });
    },
    setDisabled(disabled: boolean): void {
      patchState(store, { disabled });
    },
    setFiles(files: File[]): void {
      patchState(store, { files });
    },
    applyResult(result: DropzoneResult): void {
      patchState(store, {
        files: result.accepted,
        error: result.rejected.length > 0 ? result.rejected : null
      });
    },
    clearError(): void {
      patchState(store, { error: null });
    },
    reset(): void {
      patchState(store, initialState);
    }
  }))
);
