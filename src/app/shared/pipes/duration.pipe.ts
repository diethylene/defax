import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || seconds < 0) return '';
    const total = Math.round(seconds);
    const minutes = Math.floor(total / 60);
    const remainder = total % 60;
    if (minutes === 0) return `${remainder}s`;
    if (remainder === 0) return `${minutes}m`;
    return `${minutes}m ${remainder}s`;
  }
}
