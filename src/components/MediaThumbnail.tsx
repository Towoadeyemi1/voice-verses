import { Film } from 'lucide-react';
import { MediaItem } from '@/types/service';
import { useMediaUrl } from '@/hooks/use-templates';

/** A still of a picture or the first frame of a video. */
export const MediaThumbnail = ({ item, className }: { item: MediaItem; className?: string }) => {
  const url = useMediaUrl(item.id);
  if (!url) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-muted-foreground ${className ?? ''}`}>
        <Film className="w-6 h-6" />
      </div>
    );
  }
  return item.type === 'video' ? (
    // #t=0.5 shows a frame from half a second in rather than a black first frame
    <video src={`${url}#t=0.5`} preload="metadata" muted playsInline className={`w-full h-full object-cover ${className ?? ''}`} />
  ) : (
    <img src={url} alt={item.name} className={`w-full h-full object-cover ${className ?? ''}`} />
  );
};

/** First frame of a library video, by id. */
export const VideoStill = ({ mediaId }: { mediaId: string }) => {
  const url = useMediaUrl(mediaId);
  return url ? (
    <video src={`${url}#t=0.5`} preload="metadata" muted playsInline className="w-full h-full object-contain" />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-white/40">
      <Film className="w-8 h-8" />
    </div>
  );
};
