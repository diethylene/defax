import type { FileMetadata } from '@contract/signal/file-metadata.model';

/**
 * Builds the metadata the send slice stores for a chosen file.
 * @param file File the user chose.
 * @returns Metadata for the store.
 */
export const toFileMetadata = (file: File): FileMetadata => {
  return {
    name: file.name,
    size: file.size,
    mime: file.type,
    extension: extensionOf(file.name),
    lastModified: file.lastModified,
  };
};

/**
 * Reads the lowercase extension from a file name.
 * @param name File name.
 * @returns Extension without the dot, or an empty string when there is none.
 */
export const extensionOf = (name: string): string => {
  const index = name.lastIndexOf('.');
  const hasExtension = index > 0 && index < name.length - 1;
  if (!hasExtension) return '';
  return name.slice(index + 1).toLowerCase();
};
