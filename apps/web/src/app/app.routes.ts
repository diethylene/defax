import type { Routes } from '@angular/router';
import { ReceiverTransferComponent } from './core/components/transfer/receiver-transfer/receiver-transfer';
import { SenderTransferComponent } from './core/components/transfer/sender-transfer/sender-transfer';
import {
  receiveCanActivate,
  receiveCanDeactivate
} from './core/guards/receive.guard';
import { sendCanActivate, sendCanDeactivate } from './core/guards/send.guard';
import { HelpComponent } from './features/help/help.component';
import { ReceiveCompleteComponent } from './features/receive/receive-complete/receive-complete.component';
import { ReceiveConfirmComponent } from './features/receive/receive-confirm/receive-confirm.component';
import { ReceiveFailedComponent } from './features/receive/receive-failed/receive-failed.component';
import { ReceiveIdleComponent } from './features/receive/receive-idle/receive-idle.component';
import { ReceiveLayoutComponent } from './features/receive/receive-layout/receive-layout.component';
import { RelayHelpComponent } from './features/relay-help/relay-help.component';
import { SendApproveComponent } from './features/send/send-approve/send-approve.component';
import { SendCodeComponent } from './features/send/send-code/send-code.component';
import { SendCompleteComponent } from './features/send/send-complete/send-complete.component';
import { SendFailedComponent } from './features/send/send-failed/send-failed.component';
import { SendIdleComponent } from './features/send/send-idle/send-idle.component';
import { SendLayoutComponent } from './features/send/send-layout/send-layout.component';

/** Application routes. */
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
  { path: 'help', component: HelpComponent },
  { path: 'relay-help', component: RelayHelpComponent }
];
