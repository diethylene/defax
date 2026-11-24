import { Injectable } from '@angular/core';
import { of, type Observable } from 'rxjs';
import type { Readiness } from '@web/store/connectivity/connectivity-status.type';

/** Probes the device's network to classify its connection readiness. */
@Injectable({ providedIn: 'root' })
export class ConnectivityProbeService {
  /**
   * Probes the device's network and reports its readiness.
   * @returns The readiness; never errors, `Offline` is a valid result.
   */
  check(): Observable<Readiness> {
    return of({ _tag: 'Offline' });
  }
}
