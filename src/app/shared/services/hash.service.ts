import { Injectable } from '@angular/core';
import { defer, from, type Observable } from 'rxjs';
import { type FileHashEvent, hashFile } from '../utilities/hash-file';

@Injectable({ providedIn: 'root' })
export class HashService {
  hashFile(file: File): Observable<FileHashEvent> {
    return defer(() => from(hashFile(file)));
  }
}
