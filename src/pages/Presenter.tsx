import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Service, Slide } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { syncService } from '@/lib/syncService';
import { SlideDisplay } from '@/components/SlideDisplay';
import { SlidePreview } from '@/components/SlidePreview';
import { SlideConfiguration } from '@/components/SlideConfiguration';
import { DisplayMonitor } from '@/components/DisplayMonitor';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { Play, Square, ChevronLeft, ChevronRight, Monitor, Edit2, ExternalLink, Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ShowLogoButton } from '@/components/ShowLogoButton';
import { cn } from '@/lib/utils';
import { BibleVerse } from '@/types/bible';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  ISpeechProvider, 
  createSpeechProvider, 
  loadSpeechSettings,
  getEngineDisplayName,
  VerseDetectionController 
} from '@/speech';
import { hasSecret } from '@/lib/secrets';
import { verseAssistantOptions } from '@/ai/detectionOptions';
import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { useLibraryUpdated } from '@/hooks/use-library-updated';
import { appUrl } from '@/lib/appUrl';

const Presenter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showDisplayMonitor, setShowDisplayMonitor] = useState(true);
  
  // Voice activation
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioVolume, setAudioVolume] = useState(0);
  const speechProvider = useRef<ISpeechProvider | null>(null);
  const verseController = useRef<VerseDetectionController | null>(null);

  useEffect(() => {
    loadServices();
  }, []);
  useLibraryUpdated(() => loadServices());

  useEffect(() => {
    const serviceId = searchParams.get('service');
    if (serviceId && services.length > 0) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        setCurrentService(service);
        
        // Show service logo by default when not presenting
        if (service.serviceLogo && !isPresenting) {
          syncService.broadcast({
            type: 'SLIDE_UPDATE',
            data: { slide: null }
          });
          
          // Broadcast logo display
          const channel = new BroadcastChannel('cornerstone-display');
          channel.postMessage({
            type: 'show-logo',
            logoUrl: service.serviceLogo
          });
          localStorage.setItem('cornerstone-current-display', JSON.stringify({
            type: 'show-logo',
            logoUrl: service.serviceLogo
          }));
          channel.close();
        }
      }
    }
  }, [searchParams, services, isPresenting]);

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
      if (speechProvider.current) {
        speechProvider.current.disconnect();
      }
      if (verseController.current) {
        verseController.current.reset();
      }
    };
  }, []);

  const loadServices = async () => {
    const allServices = (await ServiceStorage.getServices()).filter(s => !s.isTemplate);
    setServices(allServices);
  };

  const getAllSlides = (service: Service | null): Slide[] => {
    if (!service) {
      console.log('getAllSlides: No service provided');
      return [];
    }
    
    if (!service.sections || service.sections.length === 0) {
      console.log('getAllSlides: No sections in service');
      return [];
    }
    
    const slides = service.sections?.flatMap(section => 
      section.subsections.flatMap(sub => sub.slides)
    ) || [];
    
    console.log(`getAllSlides: Found ${slides.length} slides in service "${service.name}"`);
    return slides;
  };

  const allSlides = getAllSlides(currentService);
  const currentSlide = currentService ? allSlides[currentIndex] : null;
  const nextSlide = allSlides[currentIndex + 1];

  const broadcastSlide = (slide: Slide | null, index: number) => {
    console.log('Broadcasting slide:', { 
      slideId: slide?.id, 
      slideType: slide?.type, 
      slideTitle: slide?.title,
      index 
    });
    
    syncService.broadcast({
      type: 'SLIDE_UPDATE',
      data: {
        slide,
        index,
        slideIndex: index,
        allSlides: allSlides,
        timestamp: new Date(),
      },
    });
  };

  const handleStart = () => {
    if (!currentService) {
      toast.error('Please select a service first');
      return;
    }
    
    const slides = getAllSlides(currentService);
    console.log('handleStart: Starting presentation with', slides.length, 'slides');
    
    if (slides.length === 0) {
      toast.error('This service has no slides', {
        description: 'Please add slides to the service first'
      });
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
    
    // Show service logo when stopping presentation
    if (currentService?.serviceLogo) {
      const channel = new BroadcastChannel('cornerstone-display');
      channel.postMessage({
        type: 'show-logo',
        logoUrl: currentService.serviceLogo
      });
      localStorage.setItem('cornerstone-current-display', JSON.stringify({
        type: 'show-logo',
        logoUrl: currentService.serviceLogo
      }));
      channel.close();
    }
    
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

  // Listen for display requests from projection windows
  useEffect(() => {
    const requestChannel = new BroadcastChannel('cornerstone-display-request');
    requestChannel.onmessage = (event) => {
      if (event.data?.type === 'request-current-slide') {
        // Always respond if there's a current slide, even if not presenting
        if (currentSlide) {
          console.log('Re-broadcasting current slide for new window:', currentSlide.title);
          broadcastSlide(currentSlide, currentIndex);
        } else if (currentService?.serviceLogo) {
          // If no slide but service has logo, show logo
          console.log('Sending logo to new window');
          const channel = new BroadcastChannel('cornerstone-display');
          channel.postMessage({
            type: 'show-logo',
            logoUrl: currentService.serviceLogo
          });
          channel.close();
        }
      }
    };

    return () => {
      requestChannel.close();
    };
  }, [currentSlide, currentIndex, currentService]);

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
    window.open(appUrl('/projection'), '_blank', 'width=1920,height=1080');
    window.open(appUrl('/confidence'), '_blank', 'width=1280,height=720');
    window.open(appUrl('/lower-third'), '_blank', 'width=1280,height=720');
    toast.success('Display windows opened');
  };

  const handleStartVoice = async () => {
    // Ask for the OpenAI key up front rather than failing mid-connection
    if (loadSpeechSettings().speechEngine === 'openai' && !(await hasSecret('openai'))) {
      setShowApiKeyDialog(true);
      return;
    }

    try {
      setIsConnecting(true);
      setIsVoiceActive(true);
      
      // Create verse detection controller (centralized detection with dedupe)
      verseController.current = new VerseDetectionController({
        onVerseDetected: (verse, detectionInfo) => {
          console.log('Presenter: Verse detected:', verse, detectionInfo);
          
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
        },
        onTranscriptUpdate: (text) => {
          setTranscript(text);
        },
        ...verseAssistantOptions((verse) => verseController.current?.triggerManualVerse(verse)),
      });

      // Load speech settings and create provider
      const settings = loadSpeechSettings();

      speechProvider.current = createSpeechProvider(settings, {
        onTranscript: (text, isFinal) => {
          console.log(`Presenter: Transcript received (final=${isFinal}):`, text);
          // Route through centralized verse detection controller
          verseController.current?.onTranscript(text, isFinal);
        },
        onVolumeUpdate: (volume) => {
          setAudioVolume(Math.round(volume));
        },
        onError: (error) => {
          console.error('Presenter: Speech provider error:', error);
          toast.error('Speech recognition error', {
            description: error.message,
          });
        },
      });

      // Set engine type in controller
      verseController.current.setEngine(settings.speechEngine);

      await speechProvider.current.init();
      setIsConnecting(false);
      
      toast.success('Voice activated', {
        description: `Using ${getEngineDisplayName(settings)}`,
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
    if (speechProvider.current) {
      speechProvider.current.disconnect();
      speechProvider.current = null;
    }
    if (verseController.current) {
      verseController.current.reset();
      verseController.current = null;
    }
    setIsVoiceActive(false);
    setAudioVolume(0);
    setTranscript('');
    toast.info('Voice deactivated');
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Control Bar */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-6 py-3">
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
                onClick={() => setShowDisplayMonitor(!showDisplayMonitor)}
              >
                <Monitor className="w-4 h-4 mr-2" />
                {showDisplayMonitor ? 'Hide' : 'Show'} Displays
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenWindows}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Windows
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!currentService ? (
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <Card className="p-12 text-center max-w-2xl">
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
        <div className="flex-1 flex justify-center overflow-hidden">
          <div className="w-full max-w-screen-2xl flex flex-col h-full">
            {/* Voice Visualizer */}
            {isVoiceActive && (
              <div className="px-6 pt-4 flex-shrink-0">
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
            </div>
          )}
          
          {/* Main Content with Resizable Panels */}
          <div className="flex-1 px-6 py-4 overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Panel - Playlist */}
              <ResizablePanel defaultSize={60} minSize={40}>
                <div className="h-full flex flex-col gap-4 pr-3 overflow-hidden">
                {/* Presentation Controls */}
                <Card className="p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
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
                </Card>

                {/* Playlist organized by sections */}
                <Card className="flex-1 p-4 flex flex-col min-h-0">
                  <h3 className="font-semibold mb-3 flex-shrink-0">Playlist</h3>
                  <div className="flex-1 space-y-4 overflow-y-auto pr-2 min-h-0">
                    {currentService?.sections.map((section) => (
                      <div key={section.id} className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10 py-1">
                          {section.name}
                        </h4>
                        {section.subsections.map((subsection) => {
                          const subsectionStartIndex = getAllSlides(currentService)
                            .findIndex(s => subsection.slides.some(subSlide => subSlide.id === s.id));
                          
                          return (
                            <div key={subsection.id} className="space-y-2">
                              <div className="text-xs font-medium text-muted-foreground/80 px-1">
                                {subsection.name}
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {subsection.slides.map((slide, slideIndex) => {
                                  const globalIndex = subsectionStartIndex + slideIndex;
                                  return (
                                    <button
                                      key={slide.id}
                                      onClick={() => handleJumpTo(globalIndex)}
                                      className={cn(
                                        "text-left p-2 rounded-lg border transition-all",
                                        "hover:bg-accent hover:border-primary/50",
                                        currentIndex === globalIndex
                                          ? "bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20"
                                          : "bg-card border-border"
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-1 mb-1">
                                        <div className="text-xs font-medium truncate flex-1">
                                          {slide.title}
                                        </div>
                                        <div className={cn(
                                          "text-xs px-1 py-0.5 rounded flex-shrink-0",
                                          currentIndex === globalIndex
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                        )}>
                                          {globalIndex + 1}
                                        </div>
                                      </div>
                                      
                                      {/* Mini preview */}
                                      <div className="aspect-video bg-black/50 rounded overflow-hidden border border-border/50">
                                        <SlidePreview slide={slide} className="w-full h-full" />
                                      </div>
                                      
                                      <div className="text-xs text-muted-foreground capitalize mt-1 truncate">
                                        {slide.type}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Right Panel - Display Monitor and Current Slide */}
            <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
              <div className="h-full flex flex-col pl-3 gap-4 overflow-hidden">
                {/* Display Monitor at top */}
                {showDisplayMonitor && (
                  <Card className="p-3 flex-shrink-0">
                    <h3 className="font-semibold text-sm mb-2">Display Preview</h3>
                    <DisplayMonitor />
                  </Card>
                )}

                {/* Current Slide Preview */}
                <Card className="p-4 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Current Slide</h3>
                    {currentSlide && <SlideConfiguration slide={currentSlide} onUpdate={handleUpdateSlide} />}
                  </div>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/20">
                    <SlideDisplay slide={currentSlide} className="h-full w-full" />
                  </div>
                  {currentSlide && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      <span className="font-medium">{currentSlide.title}</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{currentSlide.type}</span>
                    </div>
                  )}
                </Card>
              </div>
            </ResizablePanel>
            </ResizablePanelGroup>
          </div>
          </div>
        </div>
      )}

      <ApiKeyDialog
        open={showApiKeyDialog}
        onClose={(saved) => {
          setShowApiKeyDialog(false);
          if (saved) handleStartVoice();
        }}
      />
    </div>
  );
};

export default Presenter;
