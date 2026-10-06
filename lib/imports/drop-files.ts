// The browser exposes only the files/folders the user deliberately drops here.
export async function droppedImportPhotos(transfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(transfer.items).map(item => item.webkitGetAsEntry?.()).filter((entry): entry is FileSystemEntry => !!entry);
  const fallback = Array.from(transfer.files);
  const files: File[] = [];
  async function visit(entry: FileSystemEntry) {
    if (files.length > 100) throw new Error("Drop up to 100 photos at a time.");
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) files.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const children = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (!children.length) break;
        for (const child of children) await visit(child);
      }
    }
  }
  if (entries.length) for (const entry of entries) await visit(entry);
  else files.push(...fallback.filter(file => ["image/jpeg", "image/png", "image/webp"].includes(file.type)));
  if (!files.length) throw new Error("No JPG, PNG or WebP photos were found in this drop.");
  if (files.length > 100) throw new Error("Drop up to 100 photos at a time.");
  return files;
}
