import type { Routes } from '@angular/router';
import { sendCanActivate, sendCanDeactivate } from './core/guards/send.guard';
import { HelpFeature } from './features/help/help';
import { ReceiveFeature } from './features/receive/receive';
import { RelayHelpFeature } from './features/relay-help/relay-help';
import { SendApproveComponent } from './features/send/send-approve';
import { SendCodeComponent } from './features/send/send-code';
import { SendCompleteComponent } from './features/send/send-complete';
import { SendFailedComponent } from './features/send/send-failed';
import { SendIdleComponent } from './features/send/send-idle';
import { SendLayoutComponent } from './features/send/send-layout';
import { SendTransferComponent } from './features/send/send-transfer';
import { SendVerifyingComponent } from './features/send/send-verifying';

export const routes: Routes = [
  { path: '', redirectTo: 'send', pathMatch: 'full' },
  {
    path: 'send',
    component: SendLayoutComponent,
    children: [
      {
        path: '',
        component: SendIdleComponent,
        canActivate: [sendCanActivate],
        canDeactivate: [sendCanDeactivate]
      },
      {
        path: 'code',
        component: SendCodeComponent,
        canActivate: [sendCanActivate],
        canDeactivate: [sendCanDeactivate]
      },
      {
        path: 'approve',
        component: SendApproveComponent,
        canActivate: [sendCanActivate],
        canDeactivate: [sendCanDeactivate]
      },
      {
        path: 'transfer',
        component: SendTransferComponent,
        canActivate: [sendCanActivate],
        canDeactivate: [sendCanDeactivate]
      },
      {
        path: 'verifying',
        component: SendVerifyingComponent,
        canActivate: [sendCanActivate],
        canDeactivate: [sendCanDeactivate]
      },
      {
        path: 'complete',
        component: SendCompleteComponent,
        canActivate: [sendCanActivate],
        canDeactivate: [sendCanDeactivate]
      },
      {
        path: 'failed',
        component: SendFailedComponent,
        canActivate: [sendCanActivate],
        canDeactivate: [sendCanDeactivate]
      }
    ]
  },
  { path: 'receive', component: ReceiveFeature },
  { path: 'help', component: HelpFeature },
  { path: 'relay-help', component: RelayHelpFeature }
];
