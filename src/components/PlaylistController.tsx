import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Service, Slide } from '@/types/service';
import { ChevronLeft, ChevronRight, Play, Square, Eye } from 'lucide-react';
import { syncService } from '@/lib/syncService';

interface PlaylistControllerProps {
  service: Service | null;
  onSlideChange?: (slide: Slide, index: number) => void;
}

export const PlaylistController = ({ service, onSlideChange }: PlaylistControllerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);

  const currentSlide = service?.slides[currentIndex] || null;
  const nextSlide = service?.slides[currentIndex + 1] || null;

  useEffect(() => {
    if (currentSlide && isPresenting) {
      // Broadcast slide to displays
      syncService.broadcast({
        type: 'SLIDE_UPDATE',
        data: { slide: currentSlide, index: currentIndex },
      });
      onSlideChange?.(currentSlide, currentIndex);
    }
  }, [currentIndex, currentSlide, isPresenting, onSlideChange]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPresenting) return;
      
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'Escape') {
        handleStop();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPresenting, currentIndex, service]);

  const handleNext = () => {
    if (service && currentIndex < service.slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleStart = () => {
    setIsPresenting(true);
    setCurrentIndex(0);
  };

  const handleStop = () => {
    setIsPresenting(false);
    syncService.broadcast({
      type: 'SLIDE_UPDATE',
      data: { slide: null, index: -1 },
    });
  };

  const handleJumpTo = (index: number) => {
    setCurrentIndex(index);
  };

  if (!service) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">No service selected</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {!isPresenting ? (
              <Button onClick={handleStart} size="lg">
                <Play className="w-5 h-5 mr-2" />
                Start Presentation
              </Button>
            ) : (
              <Button onClick={handleStop} variant="destructive" size="lg">
                <Square className="w-5 h-5 mr-2" />
                Stop
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrevious}
              disabled={!isPresenting || currentIndex === 0}
              size="lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="px-6 py-2 bg-muted rounded-lg">
              <span className="text-lg font-semibold">
                {currentIndex + 1} / {service.slides.length}
              </span>
            </div>

            <Button
              onClick={handleNext}
              disabled={!isPresenting || currentIndex === service.slides.length - 1}
              size="lg"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Space/→ Next | ← Previous | ESC Stop
          </div>
        </div>
      </Card>

      {/* Current & Next Preview */}
      <div className="grid grid-cols-2 gap-4">
        {/* Current Slide */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Current Slide</h3>
          </div>
          {currentSlide ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase">
                {currentSlide.type}
              </div>
              <div className="font-medium">{currentSlide.title}</div>
              {currentSlide.type === 'scripture' && (
                <div className="text-sm text-muted-foreground">
                  {currentSlide.verse.book} {currentSlide.verse.chapter}:{currentSlide.verse.verse}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No slide</p>
          )}
        </Card>

        {/* Next Slide */}
        <Card className="p-4 border-dashed">
          <div className="flex items-center gap-2 mb-3">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">Next</h3>
          </div>
          {nextSlide ? (
            <div className="space-y-2 opacity-60">
              <div className="text-xs text-muted-foreground uppercase">
                {nextSlide.type}
              </div>
              <div className="font-medium">{nextSlide.title}</div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">End of service</p>
          )}
        </Card>
      </div>

      {/* Playlist */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Service Playlist</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {service.slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => handleJumpTo(index)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                index === currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{slide.title}</div>
                  <div className="text-xs opacity-70">{slide.type}</div>
                </div>
                <div className="text-xs">{index + 1}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
