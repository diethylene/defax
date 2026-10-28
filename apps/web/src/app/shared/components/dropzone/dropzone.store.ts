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

/** State held by the dropzone signal store. */
interface DropzoneStoreState {
  /** Current interaction. */
  interaction: DropzoneInteraction;
  /** Drag state inferred from the last drag event. */
  dragState: DragState;
  /** Whether the control is disabled. */
  disabled: boolean;
  /** Files currently selected. */
  files: File[];
  /** Rejections from the last selection, or null when clean. */
  error: RejectedFile[] | null;
}

/** Initial store state. */
const initialState: DropzoneStoreState = {
  interaction: 'idle',
  dragState: null,
  disabled: false,
  files: [],
  error: null
};

/** Component-level state for the dropzone directive and component. */
export const DropzoneStore = signalStore(
  withState(initialState),
  withComputed((store) => ({
    /** Interaction with the disabled flag applied. */
    phase: computed<DropzonePhase>(() =>
      store.disabled() ? 'disabled' : store.interaction()
    )
  })),
  withMethods((store) => ({
    /**
     * Stores the current interaction.
     * @param interaction Interaction to store.
     */
    setInteraction(interaction: DropzoneInteraction): void {
      patchState(store, { interaction });
    },
    /**
     * Stores the drag state.
     * @param dragState Drag state to store.
     */
    setDragState(dragState: DragState): void {
      patchState(store, { dragState });
    },
    /**
     * Stores the disabled flag.
     * @param disabled Whether the control is disabled.
     */
    setDisabled(disabled: boolean): void {
      patchState(store, { disabled });
    },
    /**
     * Replaces the selected files.
     * @param files Files to store.
     */
    setFiles(files: File[]): void {
      patchState(store, { files });
    },
    /**
     * Stores the accepted files and any rejections.
     * @param result Result of the last selection.
     */
    applyResult(result: DropzoneResult): void {
      patchState(store, {
        files: result.accepted,
        error: result.rejected.length > 0 ? result.rejected : null
      });
    },
    /** Clears the stored rejections. */
    clearError(): void {
      patchState(store, { error: null });
    },
    /** Clears the selected files and rejections. */
    clearFiles(): void {
      patchState(store, { files: [], error: null, interaction: 'idle' });
    },
    /** Restores the initial state. */
    reset(): void {
      patchState(store, initialState);
    }
  }))
);
