import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Service, Slide } from '@/types/service';
import { LAST_SERVICE_KEY, ServiceStorage } from '@/lib/serviceStorage';
import { desktop } from '@/lib/desktop';
import { syncService } from '@/lib/syncService';
import { ScaledStage } from '@/components/ScaledStage';
import { OutputContent } from '@/components/OutputContent';
import { colorFor } from '@/components/live/ServiceTimeline';
import { SlideConfiguration } from '@/components/SlideConfiguration';
import { DisplayMonitor } from '@/components/DisplayMonitor';
import { Play, Square, ChevronLeft, ChevronRight, Monitor, Edit2, ExternalLink, Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ShowLogoButton } from '@/components/ShowLogoButton';
import { CountdownControl } from '@/components/CountdownControl';
import { AlertControl } from '@/components/AlertControl';
import { countdownFromConfig, startCountdown, stopCountdown } from '@/lib/countdown';
import { cn } from '@/lib/utils';
import { BibleVerse } from '@/types/bible';
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
import { openOutputWindows } from '@/lib/outputWindows';

const Presenter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showDisplayMonitor, setShowDisplayMonitor] = useState(false);
  
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

  // Without a service in the address, open the one last worked on
  useEffect(() => {
    if (searchParams.get('service') || services.length === 0) return;
    const lastId = localStorage.getItem(LAST_SERVICE_KEY);
    const service = services.find((s) => s.id === lastId);
    if (service) setSearchParams({ service: service.id }, { replace: true });
  }, [services, searchParams, setSearchParams]);

  useEffect(() => {
    const serviceId = searchParams.get('service');
    if (serviceId && services.length > 0) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        setCurrentService(service);
        
        // Show service logo by default when not presenting
        if (service.serviceLogo && !isPresenting) {
          syncService.showLogo(service.serviceLogo);
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
        upcoming: slide ? allSlides.slice(index + 1, index + 4) : [],
        timestamp: new Date(),
      },
    });    startSectionTimer(slide);
  };

  // A section with a timer (Service Builder → Add Timer) starts it when its first
  // slide goes live, and stops it when the service moves to another section
  const timedSection = useRef<string | null>(null);
  const startSectionTimer = (slide: Slide | null) => {
    const subsection = slide && currentService?.sections.flatMap((s) => s.subsections).find((sub) => sub.slides.some((x) => x.id === slide.id));
    const id = subsection?.countdown?.enabled ? subsection.id : null;
    if (id === timedSection.current) return;
    if (timedSection.current) stopCountdown();
    timedSection.current = id;
    if (subsection?.countdown?.enabled && subsection.autoStartCountdown !== false) {
      startCountdown(countdownFromConfig(subsection.countdown, subsection.name));
    }
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
      syncService.showLogo(currentService.serviceLogo);
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

  // While a song from the service is on screen, singing moves it to the part being sung
  const jumpToRef = useRef<(index: number) => void>(() => {});
  const songStartRef = useRef(0);
  useEffect(() => {
    const controller = verseController.current;
    const slide = isPresenting ? allSlides[currentIndex] : undefined;
    if (!controller) return;
    if (slide?.type !== 'lyrics' || !slide.songTitle) {
      controller.setLiveLyrics(null);
      return;
    }
    const sameSong = (s: Slide | undefined) => s?.type === 'lyrics' && s.songTitle === slide.songTitle;
    let start = currentIndex;
    while (sameSong(allSlides[start - 1])) start--;
    let end = currentIndex;
    while (sameSong(allSlides[end + 1])) end++;
    songStartRef.current = start;
    controller.setLiveLyrics(
      allSlides.slice(start, end + 1).map((s) => (s.type === 'lyrics' ? s.content : '')),
      currentIndex - start,
    );
  }, [allSlides, currentIndex, isPresenting, isVoiceActive]);

  const handleJumpTo = (index: number) => {
    setCurrentIndex(index);
    broadcastSlide(allSlides[index], index);
    if (!isPresenting) {
      setIsPresenting(true);
      toast.success('Presentation started');
    }
  };

  jumpToRef.current = handleJumpTo;

  const handleServiceChange = (serviceId: string) => {
    localStorage.setItem(LAST_SERVICE_KEY, serviceId);
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

  const handleOpenWindows = async () => {
    const opened = await openOutputWindows();
    toast.success(opened ? 'Display windows opened' : 'The outputs are already on their screens (Settings → Screens)');
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
      desktop?.setListening(true);
      
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
        onLyricsMove: (index) => jumpToRef.current(songStartRef.current + index),
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
      desktop?.setListening(false);
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
    desktop?.setListening(false);
    setAudioVolume(0);
    setTranscript('');
    toast.info('Voice deactivated');
  };

  const upNext = isPresenting ? allSlides[currentIndex + 1] : allSlides[currentIndex];
  const describeSlide = (sl?: Slide | null) =>
    !sl ? '' : sl.type === 'lyrics' ? `${sl.songTitle}${sl.sectionLabel ? ` · ${sl.sectionLabel}` : ''}` : sl.title || sl.type;

  return (
    <div className="h-screen bg-background text-foreground grid grid-rows-[64px_minmax(0,1fr)] overflow-hidden">
      {/* Top bar, like the live screen */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 shadow-[0_1px_0_hsl(var(--border))]">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/service-planner')} title="Back to Services" aria-label="Back to Services">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Select value={currentService?.id} onValueChange={handleServiceChange}>
            <SelectTrigger className="w-[300px] h-10 border-0 bg-transparent hover:bg-muted text-[15px] font-semibold" aria-label="Service">
              <SelectValue placeholder="Choose a service…" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} · {service.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentService && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/service-builder/${currentService.id}`)}>
              <Edit2 className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 h-11 pl-2 pr-1.5 rounded-full bg-card/80 shadow-[0_0_0_1px_hsl(var(--border))]">
          {!isVoiceActive ? (
            <button type="button" onClick={handleStartVoice} disabled={isConnecting} className="h-8 px-3.5 rounded-full bg-primary/15 hover:bg-primary/25 text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              {isConnecting ? 'Starting…' : 'Follow the singing and scripture'}
            </button>
          ) : (
            <>
              <span className="flex items-center gap-[3px] h-4 pl-1.5" aria-hidden="true">
                {[0.5, 0.8, 1, 0.75, 0.45].map((k, i) => (
                  <i key={i} className="w-[3px] rounded-full bg-emerald-500 transition-[height] duration-100" style={{ height: `${Math.max(18, Math.min(1, audioVolume / 60) * k * 100)}%` }} />
                ))}
              </span>
              <span className="text-sm font-medium max-w-[38ch] truncate">
                Listening{transcript && <span className="text-muted-foreground"> · …{transcript.split(' ').slice(-8).join(' ')}</span>}
              </span>
              <button type="button" onClick={handleStopVoice} className="h-8 px-3 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5">
                <MicOff className="w-4 h-4" />
                Stop
              </button>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <AlertControl className="h-9 hidden lg:flex" />
          <CountdownControl className="h-9 hidden lg:flex" />
          <Button variant="ghost" size="sm" onClick={() => setShowDisplayMonitor(!showDisplayMonitor)} aria-pressed={showDisplayMonitor}>
            <Monitor className="w-4 h-4" />
            Other screens
          </Button>
          <Button variant="ghost" size="icon" onClick={handleOpenWindows} title="Open the output windows" aria-label="Open the output windows">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {!currentService ? (
        <div className="grid place-items-center px-6">
          <div className="text-center max-w-md">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted grid place-items-center mb-4">
              <Monitor className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="m-0 text-xl font-semibold">Choose a service to present</h2>
            <p className="m-0 mt-1.5 text-muted-foreground">Pick one at the top, or plan one in Services.</p>
            <Button className="mt-5" onClick={() => navigate('/service-planner')}>Go to Services</Button>
          </div>
        </div>
      ) : (
        <div className="min-h-0 grid grid-cols-[minmax(0,1fr)_clamp(380px,32vw,680px)]">
          {/* The service, slide by slide */}
          <main className="min-h-0 overflow-y-auto px-6 xl:px-10 py-6 space-y-8">
            {currentService.sections.map((section) => (
              <section key={section.id}>
                <h3 className="m-0 mb-3 flex items-center gap-2 text-[15px] font-semibold">
                  <span className="w-2 h-2 rounded-full" style={{ background: colorFor(section.name) }} />
                  {section.name}
                </h3>
                <div className="space-y-5">
                  {section.subsections.map((subsection) => {
                    const startIndex = allSlides.findIndex((sl) => subsection.slides.some((x) => x.id === sl.id));
                    return (
                      <div key={subsection.id}>
                        <p className="m-0 mb-2 text-sm text-muted-foreground">{subsection.name}{subsection.slides.length === 0 && ' · no slides'}</p>
                        {subsection.slides.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                            {subsection.slides.map((slide, i) => {
                              const index = startIndex + i;
                              const live = isPresenting && currentIndex === index;
                              const next = upNext?.id === slide.id;
                              return (
                                <button key={slide.id} type="button" onClick={() => handleJumpTo(index)} className="text-left group">
                                  <div
                                    className={cn(
                                      'relative rounded-xl overflow-hidden transition',
                                      live ? 'ring-2 ring-[hsl(var(--live))]' : next ? 'ring-2 ring-[hsl(var(--next))]' : 'ring-1 ring-border group-hover:ring-foreground/40',
                                    )}
                                  >
                                    <ScaledStage className="aspect-video bg-black">
                                      <OutputContent live={{ slide }} output="projection" preview />
                                    </ScaledStage>
                                    <span className={cn('absolute left-1.5 top-1.5 min-w-6 h-6 px-1.5 rounded-md text-[11px] font-bold grid place-items-center', live ? 'bg-[hsl(var(--live))] text-white' : 'bg-black/60 text-white')}>
                                      {index + 1}
                                    </span>
                                  </div>
                                  <p className="m-0 mt-1.5 text-[13px] font-medium truncate">{describeSlide(slide)}</p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </main>

          {/* The screens: Live, Take, Next */}
          <aside className="min-h-0 overflow-y-auto pr-6 pl-2 py-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold min-h-[30px]">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--live))]" />
              Live
              <span className="font-medium text-muted-foreground truncate">{isPresenting ? `${currentIndex + 1} of ${allSlides.length} · ${describeSlide(currentSlide)}` : 'not presenting yet'}</span>
              <span className="ml-auto flex items-center gap-1">
                {currentSlide && <SlideConfiguration slide={currentSlide} onUpdate={handleUpdateSlide} />}
                <ShowLogoButton serviceId={currentService.id} variant="ghost" size="sm" />
              </span>
            </div>
            <div className="relative rounded-[14px] overflow-hidden shadow-[0_0_0_2px_hsl(var(--live)),0_18px_50px_-22px_hsl(var(--live))]">
              <ScaledStage className="aspect-video bg-black">
                <OutputContent live={isPresenting && currentSlide ? { slide: currentSlide } : null} output="projection" preview />
              </ScaledStage>
            </div>

            {isPresenting ? (
              <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                <Button variant="secondary" className="h-14 w-14 rounded-2xl" onClick={handlePrevious} disabled={currentIndex === 0} aria-label="Previous slide">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex >= allSlides.length - 1}
                  className="h-14 rounded-2xl text-foreground flex items-center justify-center gap-2.5 text-[17px] font-semibold bg-gradient-to-b from-[hsl(260_7%_21%)] to-[hsl(260_7%_16%)] hover:from-[hsl(260_7%_24%)] hover:to-[hsl(260_7%_19%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_0_0_1px_rgba(255,255,255,0.06)] disabled:opacity-40"
                >
                  <ChevronRight className="w-5 h-5 text-[hsl(var(--next))]" />
                  Next slide
                  <kbd className="font-sans text-xs font-semibold px-1.5 py-0.5 rounded-md bg-white/[0.07] text-muted-foreground">→</kbd>
                </button>
                <Button variant="secondary" className="h-14 rounded-2xl" onClick={handleStop} title="Stop presenting and show the logo">
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              </div>
            ) : (
              <Button className="h-14 rounded-2xl text-[17px]" onClick={handleStart} disabled={allSlides.length === 0}>
                <Play className="w-5 h-5" />
                Start presenting
              </Button>
            )}

            <div className="flex items-center gap-2 text-sm font-semibold min-h-[30px]">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--next))]" />
              Next
              <span className="font-medium text-muted-foreground truncate">{upNext ? describeSlide(upNext) : 'the end of the service'}</span>
            </div>
            <div className="rounded-[14px] overflow-hidden shadow-[0_0_0_2px_hsl(var(--next))]">
              <ScaledStage className="aspect-video bg-black">
                <OutputContent live={upNext ? { slide: upNext } : null} output="projection" preview />
              </ScaledStage>
            </div>

            {showDisplayMonitor && (
              <div className="pt-2">
                <p className="m-0 mb-2 text-sm font-semibold">Other screens</p>
                <DisplayMonitor />
              </div>
            )}
          </aside>
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
