import { Pipe, type PipeTransform } from '@angular/core';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || value < 0) return '';
    if (value === 0) return '0 B';

    const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), UNITS.length - 1);
    const size = value / 1024 ** exponent;
    const precision = exponent === 0 || size >= 10 ? 0 : 1;

    return `${size.toFixed(precision)} ${UNITS[exponent]}`;
  }
}
