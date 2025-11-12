import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Service, Slide } from '@/types/service';
import { ChevronLeft, ChevronRight, Play, Square, Eye, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { syncService } from '@/lib/syncService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PlaylistControllerProps {
  service: Service | null;
  onSlideChange?: (slide: Slide, index: number) => void;
}

export const PlaylistController = ({ service, onSlideChange }: PlaylistControllerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const currentSlide = service?.slides[currentIndex] || null;
  const nextSlide = service?.slides[currentIndex + 1] || null;

  // Initialize all sections as expanded
  useEffect(() => {
    if (service?.sections) {
      setExpandedSections(new Set(service.sections.map(s => s.id)));
    }
  }, [service?.sections]);

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
    if (!isPresenting) {
      setIsPresenting(true);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getSlideGlobalIndex = (sectionIndex: number, subsectionIndex: number, slideIndex: number): number => {
    if (!service?.sections) return -1;
    let globalIndex = 0;
    for (let si = 0; si < service.sections.length; si++) {
      const section = service.sections[si];
      for (let subi = 0; subi < section.subsections.length; subi++) {
        const subsection = section.subsections[subi];
        for (let sli = 0; sli < subsection.slides.length; sli++) {
          if (si === sectionIndex && subi === subsectionIndex && sli === slideIndex) {
            return globalIndex;
          }
          globalIndex++;
        }
      }
    }
    return -1;
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

      {/* Playlist - Horizontal Layout */}
      <Card className="p-4 flex flex-col h-[calc(100vh-32rem)]">
        <h3 className="font-semibold mb-3">Service Playlist</h3>
        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-4">
            {service.sections?.map((section, sectionIndex) => (
              <Collapsible
                key={section.id}
                open={expandedSections.has(section.id)}
                onOpenChange={() => toggleSection(section.id)}
              >
                <Card className="border-l-4 border-l-primary/50">
                  <div className="bg-muted/30 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          {expandedSections.has(section.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <h4 className="font-semibold text-sm">{section.name}</h4>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {section.subsections.reduce((acc, sub) => acc + sub.slides.length, 0)} slides
                      </span>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="p-3 space-y-3">
                      {section.subsections.map((subsection, subsectionIndex) => (
                        <div key={subsection.id}>
                          <div className="mb-2">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {subsection.name}
                            </h5>
                          </div>
                          {subsection.slides.length === 0 ? (
                            <div className="text-center py-4 border-2 border-dashed rounded-lg">
                              <p className="text-xs text-muted-foreground">No slides</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                              {subsection.slides.map((slide, slideIndex) => {
                                const globalIndex = getSlideGlobalIndex(sectionIndex, subsectionIndex, slideIndex);
                                const isActive = globalIndex === currentIndex;
                                
                                return (
                                  <button
                                    key={slide.id}
                                    onClick={() => handleJumpTo(globalIndex)}
                                    className={`text-left transition-all rounded-lg overflow-hidden border-2 ${
                                      isActive
                                        ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-105'
                                        : 'border-transparent hover:border-primary/50'
                                    }`}
                                  >
                                    <div className={`p-2 ${isActive ? 'bg-primary/10' : 'bg-card hover:bg-muted/50'}`}>
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <div className={`text-xs font-medium truncate ${isActive ? 'text-primary font-semibold' : ''}`}>
                                          {slide.title}
                                        </div>
                                      </div>
                                      <div className="text-[10px] text-muted-foreground uppercase">
                                        {slide.type}
                                      </div>
                                      <div className={`text-xs mt-1 px-1.5 py-0.5 rounded text-center ${
                                        isActive ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted'
                                      }`}>
                                        {globalIndex + 1}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};
