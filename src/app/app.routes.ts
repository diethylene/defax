import type { Routes } from '@angular/router';
import {
  receiveCanActivate,
  receiveCanDeactivate
} from './core/guards/receive.guard';
import { sendCanActivate, sendCanDeactivate } from './core/guards/send.guard';
import { HelpFeature } from './features/help/help';
import { ReceiveCompleteComponent } from './features/receive/receive-complete';
import { ReceiveConfirmComponent } from './features/receive/receive-confirm';
import { ReceiveFailedComponent } from './features/receive/receive-failed';
import { ReceiveIdleComponent } from './features/receive/receive-idle';
import { ReceiveLayoutComponent } from './features/receive/receive-layout';
import { ReceiveTransferComponent } from './features/receive/receive-transfer';
import { ReceiveVerifyComponent } from './features/receive/receive-verify';
import { RelayHelpFeature } from './features/relay-help/relay-help';
import { SendApproveComponent } from './features/send/send-approve';
import { SendCodeComponent } from './features/send/send-code';
import { SendCompleteComponent } from './features/send/send-complete';
import { SendFailedComponent } from './features/send/send-failed';
import { SendIdleComponent } from './features/send/send-idle';
import { SendLayoutComponent } from './features/send/send-layout';
import { SendTransferComponent } from './features/send/send-transfer';
import { SendVerifyComponent } from './features/send/send-verify';

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
        path: 'verify',
        component: SendVerifyComponent,
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
  {
    path: 'receive',
    component: ReceiveLayoutComponent,
    children: [
      {
        path: '',
        component: ReceiveIdleComponent,
        canActivate: [receiveCanActivate],
        canDeactivate: [receiveCanDeactivate]
      },
      {
        path: 'confirm',
        component: ReceiveConfirmComponent,
        canActivate: [receiveCanActivate],
        canDeactivate: [receiveCanDeactivate]
      },
      {
        path: 'transfer',
        component: ReceiveTransferComponent,
        canActivate: [receiveCanActivate],
        canDeactivate: [receiveCanDeactivate]
      },
      {
        path: 'verify',
        component: ReceiveVerifyComponent,
        canActivate: [receiveCanActivate],
        canDeactivate: [receiveCanDeactivate]
      },
      {
        path: 'complete',
        component: ReceiveCompleteComponent,
        canActivate: [receiveCanActivate],
        canDeactivate: [receiveCanDeactivate]
      },
      {
        path: 'failed',
        component: ReceiveFailedComponent,
        canActivate: [receiveCanActivate],
        canDeactivate: [receiveCanDeactivate]
      }
    ]
  },
  { path: 'help', component: HelpFeature },
  { path: 'relay-help', component: RelayHelpFeature }
];
