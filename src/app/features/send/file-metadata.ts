export interface FileMetadata {
  name: string;
  size: number;
  mime: string;
  extension: string;
  lastModified: number;
}

export function toFileMetadata(file: File): FileMetadata {
  return {
    name: file.name,
    size: file.size,
    mime: file.type,
    extension: extensionOf(file.name),
    lastModified: file.lastModified
  };
}

export function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  if (index <= 0 || index === name.length - 1) return '';
  return name.slice(index + 1).toLowerCase();
}
