import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore, routerReducer } from '@ngrx/router-store';
import { provideStore } from '@ngrx/store';
import { App } from './app';
import {
  applyThemeMode$,
  persistThemeMode$
} from './store/application-config/application-config.effects';
import { applicationConfigFeature } from './store/application-config/application-config.reducer';
import { sendFeature } from './store/send/send.reducer';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideStore({
          applicationConfig: applicationConfigFeature.reducer,
          send: sendFeature.reducer,
          router: routerReducer
        }),
        provideEffects({ applyThemeMode$, persistThemeMode$ }),
        provideRouterStore()
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the navbar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
  });
});
