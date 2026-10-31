import { useEffect, useState } from 'react';
import { MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { mediaUrl } from '@/lib/mediaFiles';
import { isNetworkViewer, networkMediaUrl } from '@/lib/networkView';
import { Assignments, loadAssignments, loadTemplates, Template, TEMPLATES_CHANGED } from '@/lib/templates';

/** Templates and their assignments, kept current in every window. */
export function useTemplates(): { templates: Template[]; assignments: Assignments } {
  const [state, setState] = useState(() => ({ templates: loadTemplates(), assignments: loadAssignments() }));

  useEffect(() => {
    const reload = () => setState({ templates: loadTemplates(), assignments: loadAssignments() });
    // Same window: our own event; other windows: the storage event
    window.addEventListener(TEMPLATES_CHANGED, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(TEMPLATES_CHANGED, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  return state;
}

const mediaCache = new Map<string, Promise<MediaItem | undefined>>();

/** A picture or video from the media library, by id. */
export function useMediaItem(mediaId?: string): MediaItem | undefined {
  const [item, setItem] = useState<MediaItem | undefined>();

  useEffect(() => {
    if (!mediaId) {
      setItem(undefined);
      return;
    }
    let cancelled = false;
    if (!mediaCache.has(mediaId)) {
      mediaCache.set(mediaId, ServiceStorage.getMedia().then((all) => all.find((m) => m.id === mediaId)));
    }
    mediaCache.get(mediaId)!.then((found) => {
      if (!found) mediaCache.delete(mediaId); // may be added later
      if (!cancelled) setItem(found);
    });
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  return item;
}

/** A URL to show or play a library item (picture or video), by id. */
export function useMediaUrl(mediaId?: string): string | undefined {
  const item = useMediaItem(isNetworkViewer ? undefined : mediaId);
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    if (!item) setUrl(undefined);
    else mediaUrl(item).then((u) => !cancelled && setUrl(u));
    return () => {
      cancelled = true;
    };
  }, [item]);
  // Network viewers get pictures and videos from the operator's computer
  if (isNetworkViewer) return mediaId ? networkMediaUrl(mediaId) : undefined;
  return url;
}

/** The church logo (Settings → Logo), kept current in every window. */
export function useLogo(): string {
  const [logo, setLogo] = useState(() => localStorage.getItem('global-service-logo') || '');
  useEffect(() => {
    const reload = () => setLogo(localStorage.getItem('global-service-logo') || '');
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, []);
  return logo;
}
