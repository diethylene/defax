import type { Routes } from '@angular/router';
import { HelpFeature } from './features/help/help';
import { ReceiveFeature } from './features/receive/receive';
import { SendFeature } from './features/send/send';

export const routes: Routes = [
  { path: '', redirectTo: 'send', pathMatch: 'full' },
  { path: 'send', component: SendFeature },
  { path: 'receive', component: ReceiveFeature },
  { path: 'help', component: HelpFeature }
];
