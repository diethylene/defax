import { Pipe, type PipeTransform } from '@angular/core';
import { formatFileSize } from '../utilities/file-size';

@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return formatFileSize(value);
  }
}
