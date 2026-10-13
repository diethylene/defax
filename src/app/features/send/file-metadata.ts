export interface FileMetadata {
  name: string;
  size: number;
  mime: string;
}

export function toFileMetadata(file: File): FileMetadata {
  return { name: file.name, size: file.size, mime: file.type };
}
