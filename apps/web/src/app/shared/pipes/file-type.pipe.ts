import { Pipe, type PipeTransform } from '@angular/core';
import {
  DEFAULT_FILE_TYPE_LABEL,
  FILE_TYPE_LABELS
} from '../constants/file-types';

@Pipe({ name: 'fileType' })
export class FileTypePipe implements PipeTransform {
  transform(extension: string | null | undefined): string {
    if (!extension) return DEFAULT_FILE_TYPE_LABEL;
    return FILE_TYPE_LABELS[extension.toLowerCase()] ?? DEFAULT_FILE_TYPE_LABEL;
  }
}
