import type { Routes } from '@angular/router';
import { ReceiverTransferComponent } from './core/components/transfer/receiver-transfer/receiver-transfer.component';
import { SenderTransferComponent } from './core/components/transfer/sender-transfer/sender-transfer.component';
import {
  receiveCanActivate,
  receiveCanDeactivate
} from './core/guards/receive.guard';
import { sendCanActivate, sendCanDeactivate } from './core/guards/send.guard';
import { HelpFeature } from './features/help/help';
import { ReceiveCompleteComponent } from './features/receive/receive-complete/receive-complete';
import { ReceiveConfirmComponent } from './features/receive/receive-confirm/receive-confirm';
import { ReceiveFailedComponent } from './features/receive/receive-failed/receive-failed';
import { ReceiveIdleComponent } from './features/receive/receive-idle/receive-idle';
import { ReceiveLayoutComponent } from './features/receive/receive-layout/receive-layout';
import { RelayHelpFeature } from './features/relay-help/relay-help';
import { SendApproveComponent } from './features/send/send-approve/send-approve';
import { SendCodeComponent } from './features/send/send-code/send-code';
import { SendCompleteComponent } from './features/send/send-complete/send-complete';
import { SendFailedComponent } from './features/send/send-failed/send-failed';
import { SendIdleComponent } from './features/send/send-idle/send-idle';
import { SendLayoutComponent } from './features/send/send-layout/send-layout';

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
        component: SenderTransferComponent,
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
        component: ReceiverTransferComponent,
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
