import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Service, Slide } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { syncService } from '@/lib/syncService';
import { SlideDisplay } from '@/components/SlideDisplay';
import { SlideConfiguration } from '@/components/SlideConfiguration';
import { DisplayMonitor } from '@/components/DisplayMonitor';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { Play, Square, ChevronLeft, ChevronRight, Monitor, Edit2, ExternalLink, Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ShowLogoButton } from '@/components/ShowLogoButton';
import { cn } from '@/lib/utils';
import { RealtimeWebRTC } from '@/lib/realtimeWebRTC';
import { BibleVerse } from '@/types/bible';

const Presenter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  
  // Voice activation
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioVolume, setAudioVolume] = useState(0);
  const realtimeChat = useRef<RealtimeWebRTC | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    const serviceId = searchParams.get('service');
    if (serviceId && services.length > 0) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        setCurrentService(service);
      }
    }
  }, [searchParams, services]);

  useEffect(() => {
    if (!isPresenting) return;

    const handleKeyPress = (e: KeyboardEvent) => {
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
  }, [isPresenting, currentIndex, currentService]);

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      if (realtimeChat.current) {
        realtimeChat.current.disconnect();
      }
    };
  }, []);

  const loadServices = () => {
    const allServices = ServiceStorage.getServices().filter(s => !s.isTemplate);
    setServices(allServices);
  };

  const getAllSlides = (service: Service | null): Slide[] => {
    if (!service) return [];
    return service.sections?.flatMap(section => 
      section.subsections.flatMap(sub => sub.slides)
    ) || [];
  };

  const currentSlide = currentService ? getAllSlides(currentService)[currentIndex] : null;
  const allSlides = getAllSlides(currentService);
  const nextSlide = allSlides[currentIndex + 1];

  const broadcastSlide = (slide: Slide | null, index: number) => {
    syncService.broadcast({
      type: 'SLIDE_UPDATE',
      data: {
        slide,
        index,
        timestamp: new Date(),
      },
    });
  };

  const handleStart = () => {
    if (!currentService) {
      toast.error('Please select a service first');
      return;
    }
    setIsPresenting(true);
    setCurrentIndex(0);
    broadcastSlide(allSlides[0], 0);
    toast.success('Presentation started');
  };

  const handleStop = () => {
    setIsPresenting(false);
    broadcastSlide(null, -1);
    toast.info('Presentation stopped');
  };

  const handleNext = () => {
    if (currentIndex < allSlides.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      broadcastSlide(allSlides[newIndex], newIndex);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      broadcastSlide(allSlides[newIndex], newIndex);
    }
  };

  const handleJumpTo = (index: number) => {
    setCurrentIndex(index);
    broadcastSlide(allSlides[index], index);
    if (!isPresenting) {
      setIsPresenting(true);
      toast.success('Presentation started');
    }
  };

  const handleServiceChange = (serviceId: string) => {
    setSearchParams({ service: serviceId });
    setCurrentIndex(0);
    setIsPresenting(false);
  };

  const handleUpdateSlide = (updatedSlide: Slide) => {
    if (!currentService) return;

    // Update the slide in the service
    const updatedSections = currentService.sections.map(section => ({
      ...section,
      subsections: section.subsections.map(sub => ({
        ...sub,
        slides: sub.slides.map(s => s.id === updatedSlide.id ? updatedSlide : s)
      }))
    }));

    const updatedService = {
      ...currentService,
      sections: updatedSections,
    };

    ServiceStorage.saveService(updatedService);
    setCurrentService(updatedService);
    loadServices();
    
    // Re-broadcast current slide if it was updated
    if (currentSlide?.id === updatedSlide.id) {
      broadcastSlide(updatedSlide, currentIndex);
    }
    
    toast.success('Slide updated');
  };

  const handleOpenWindows = () => {
    window.open('/projection', '_blank', 'width=1920,height=1080');
    window.open('/confidence', '_blank', 'width=1280,height=720');
    window.open('/lower-third', '_blank', 'width=1280,height=720');
    toast.success('Display windows opened');
  };

  const handleStartVoice = async () => {
    try {
      setIsConnecting(true);
      setIsVoiceActive(true);
      
      realtimeChat.current = new RealtimeWebRTC(
        (text) => {
          console.log('Transcript:', text);
          setTranscript(text);
        },
        (verse: BibleVerse) => {
          if (verse) {
            // Create a scripture slide
            const scriptureSlide: Slide = {
              id: `voice-${Date.now()}`,
              type: 'scripture',
              title: `${verse.book} ${verse.chapter}:${verse.verse}`,
              verse: verse,
              textFormatting: { fontSize: 'medium', alignment: 'center' }
            };
            
            // Broadcast to displays
            broadcastSlide(scriptureSlide, -1);
            
            toast.success('Scripture detected!', {
              description: `${verse.book} ${verse.chapter}:${verse.verse}`,
              duration: 3000,
            });
          }
        },
        (volume) => {
          setAudioVolume(Math.round(volume));
        }
      );

      await realtimeChat.current.init();
      setIsConnecting(false);
      
      toast.success('Voice activated', {
        description: 'Speak scripture references to display them',
      });
    } catch (error) {
      console.error('Error starting voice:', error);
      setIsConnecting(false);
      setIsVoiceActive(false);
      toast.error('Failed to start voice recognition', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleStopVoice = () => {
    if (realtimeChat.current) {
      realtimeChat.current.disconnect();
      realtimeChat.current = null;
    }
    setIsVoiceActive(false);
    setAudioVolume(0);
    setTranscript('');
    toast.info('Voice deactivated');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Control Bar */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/service-planner')}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              
              <div className="h-8 w-px bg-border" />
              
              <Select value={currentService?.id} onValueChange={handleServiceChange}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {service.date.toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentService && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/service-builder/${currentService.id}`)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Service
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Voice Activation Button */}
              {!isVoiceActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartVoice}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4 mr-2" />
                  )}
                  Voice Mode
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStopVoice}
                >
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Voice
                </Button>
              )}
              
              <ShowLogoButton serviceId={currentService?.id} variant="outline" size="sm" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenWindows}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Displays
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!currentService ? (
        <div className="container mx-auto px-4 py-16">
          <Card className="p-12 text-center">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No Service Selected</h2>
            <p className="text-muted-foreground mb-6">
              Select a service from the dropdown above to start presenting
            </p>
            <Button onClick={() => navigate('/service-planner')}>
              Go to Service Planner
            </Button>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Voice Visualizer */}
            {isVoiceActive && (
              <Card className="p-4">
                <div className="space-y-3">
                  <AudioVisualizer isListening={isVoiceActive} volume={audioVolume} />
                  {transcript && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Last detected:</p>
                      <p className="text-sm">{transcript}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
            
            {/* Display Monitor Section */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Live Display Outputs</h3>
              <DisplayMonitor />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Preview Area */}
              <div className="lg:col-span-2 space-y-4">
              {/* Presentation Controls */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium">
                    Slide {currentIndex + 1} of {allSlides.length}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPresenting ? (
                      <Button onClick={handleStart} size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                    ) : (
                      <Button onClick={handleStop} variant="destructive" size="sm">
                        <Square className="w-4 h-4 mr-2" />
                        Stop
                      </Button>
                    )}
                    <Button
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={currentIndex >= allSlides.length - 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Current Slide Preview */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/20">
                  <SlideDisplay slide={currentSlide} className="h-full" />
                </div>

                {currentSlide && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{currentSlide.title}</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{currentSlide.type}</span>
                    </div>
                    <SlideConfiguration slide={currentSlide} onUpdate={handleUpdateSlide} />
                  </div>
                )}
              </Card>

              {/* Next Slide Preview */}
              {nextSlide && (
                <Card className="p-4">
                  <div className="text-sm font-medium mb-2 text-muted-foreground">
                    Next Slide
                  </div>
                  <div className="aspect-video bg-black/50 rounded-lg overflow-hidden border">
                    <SlideDisplay slide={nextSlide} className="h-full opacity-60" />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {nextSlide.title}
                  </div>
                </Card>
              )}
            </div>

            {/* Playlist Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-4 sticky top-4">
                <h3 className="font-semibold mb-3">Playlist</h3>
                <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
                  {allSlides.map((slide, index) => (
                    <button
                      key={slide.id}
                      onClick={() => handleJumpTo(index)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        "hover:bg-accent hover:border-primary/50",
                        currentIndex === index 
                          ? "bg-primary/10 border-primary shadow-sm" 
                          : "bg-card border-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-sm font-medium truncate flex-1">
                          {slide.title}
                        </div>
                        <div className={cn(
                          "text-xs px-1.5 py-0.5 rounded",
                          currentIndex === index 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {slide.type}
                      </div>
                      
                      {/* Mini preview */}
                      <div className="mt-2 aspect-video bg-black/50 rounded overflow-hidden border border-border/50">
                        <SlideDisplay slide={slide} className="h-full scale-50 origin-top-left w-[200%]" />
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Presenter;
