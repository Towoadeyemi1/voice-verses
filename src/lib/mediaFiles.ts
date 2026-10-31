import { MediaItem } from '@/types/service';
import { indexedDBService } from '@/lib/indexedDBService';
import { ServiceStorage } from '@/lib/serviceStorage';

/**
 * Videos in the media library. The file itself is stored on this computer
 * apart from its library entry (pictures are small enough to keep inside it),
 * and played from a local object URL.
 */
export async function addVideoToLibrary(file: File): Promise<MediaItem> {
  const item: MediaItem = {
    id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'video',
    name: file.name.replace(/\.[^.]+$/, ''),
    mimeType: file.type,
    sizeBytes: file.size,
    createdAt: new Date(),
  };
  await indexedDBService.saveFile(item.id, file);
  await ServiceStorage.saveMediaItem(item);
  return item;
}

export async function addPictureToLibrary(file: File): Promise<MediaItem> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const item: MediaItem = { id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: 'image', name: file.name.replace(/\.[^.]+$/, ''), url, createdAt: new Date() };
  await ServiceStorage.saveMediaItem(item);
  return item;
}

const objectUrls = new Map<string, Promise<string | undefined>>();

/** A URL to show or play this item: the picture itself, or the video file on this computer. */
export function mediaUrl(item: MediaItem): Promise<string | undefined> {
  if (item.type !== 'video') return Promise.resolve(item.url);
  if (!objectUrls.has(item.id)) {
    objectUrls.set(
      item.id,
      indexedDBService.getFile(item.id).then((blob) => {
        if (!blob) objectUrls.delete(item.id); // e.g. added on another computer
        return blob ? URL.createObjectURL(blob) : undefined;
      }),
    );
  }
  return objectUrls.get(item.id)!;
}

export async function deleteMediaFile(id: string): Promise<void> {
  await indexedDBService.deleteFile(id).catch(() => {});
  const url = await objectUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(id);
}
