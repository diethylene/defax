import { describe, expect, it } from 'vitest';
import { ApplicationConfigActions } from './application-config.actions';
import {
  applicationConfigFeature,
  initialApplicationConfigState,
} from './application-config.reducer';

describe('applicationConfigFeature.reducer', () => {
  describe('success', () => {
    it('stores the mode a set action carries', () => {
      const next = applicationConfigFeature.reducer(
        initialApplicationConfigState,
        ApplicationConfigActions.setMode({ mode: 'dark' }),
      );

      expect(next).toEqual({ mode: 'dark' });
    });

    it('turns light into dark on toggle', () => {
      const next = applicationConfigFeature.reducer(
        initialApplicationConfigState,
        ApplicationConfigActions.toggleMode(),
      );

      expect(next).toEqual({ mode: 'dark' });
    });

    it('turns dark into light on toggle', () => {
      const dark = applicationConfigFeature.reducer(
        initialApplicationConfigState,
        ApplicationConfigActions.setMode({ mode: 'dark' }),
      );

      const next = applicationConfigFeature.reducer(
        dark,
        ApplicationConfigActions.toggleMode(),
      );

      expect(next).toEqual({ mode: 'light' });
    });
  });

  describe('invariants', () => {
    it('keeps the mode for an unrelated action', () => {
      const dark = applicationConfigFeature.reducer(
        initialApplicationConfigState,
        ApplicationConfigActions.setMode({ mode: 'dark' }),
      );

      const next = applicationConfigFeature.reducer(dark, {
        type: 'unrelated',
      });

      expect(next).toEqual(dark);
    });
  });
});
