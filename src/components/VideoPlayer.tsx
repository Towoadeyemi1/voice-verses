import { useMediaUrl } from '@/hooks/use-templates';

/** A video from the media library, filling its box. */
export const VideoPlayer = ({ mediaId, loop, sound, className }: { mediaId: string; loop: boolean; sound: boolean; className?: string }) => {
  const url = useMediaUrl(mediaId);
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-black text-white/50 ${className ?? ''}`}>
        <p className="text-2xl">This video is not on this computer</p>
      </div>
    );
  }
  return <video key={url} src={url} autoPlay loop={loop} muted={!sound} playsInline className={`object-contain bg-black ${className ?? ''}`} />;
};
