import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Service, Slide, ScriptureSlide, LyricsSlide, ImageSlide, ServiceSection, ServiceSubsection } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { BibleParser } from '@/lib/bibleParser';
import { Book, Music, Image as ImageIcon, Plus, Trash2, Save, Copy, ChevronDown, ChevronRight, FolderPlus, FilePlus } from 'lucide-react';
import { toast } from 'sonner';
import { SlideConfiguration } from '@/components/SlideConfiguration';
import { CountdownConfiguration } from '@/components/CountdownConfig';
import { PPTXImport } from '@/components/PPTXImport';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ServiceBuilder = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [editingSlide, setEditingSlide] = useState<Partial<Slide> | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubsection, setSelectedSubsection] = useState<string | null>(null);
  const media = ServiceStorage.getMedia();

  useEffect(() => {
    if (serviceId) {
      const services = ServiceStorage.getServices();
      const found = services.find(s => s.id === serviceId);
      if (found) {
        setService(found);
        // Auto-select first section/subsection
        if (found.sections?.length > 0) {
          setSelectedSection(found.sections[0].id);
          if (found.sections[0].subsections?.length > 0) {
            setSelectedSubsection(found.sections[0].subsections[0].id);
          }
        }
      } else {
        toast.error('Service not found');
        navigate('/service-planner');
      }
    }
  }, [serviceId, navigate]);

  const handleSave = () => {
    if (service) {
      ServiceStorage.saveService(service);
      toast.success('Service saved');
    }
  };

  const handleSaveAsTemplate = () => {
    if (!service) return;
    
    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    const template: Service = {
      ...service,
      id: `template-${Date.now()}`,
      isTemplate: true,
      templateName,
    };
    
    ServiceStorage.saveService(template);
    toast.success('Template saved');
  };

  const handleAddSection = () => {
    const name = prompt('Enter section name (e.g., "Worship", "Sermon"):');
    if (!name) return;

    const newSection: ServiceSection = {
      id: Date.now().toString(),
      name,
      subsections: [],
    };

    setService(prev => prev ? {
      ...prev,
      sections: [...(prev.sections || []), newSection],
    } : null);
    toast.success('Section added');
  };

  const handleAddSubsection = (sectionId: string) => {
    const name = prompt('Enter subsection name (e.g., song title, testimony name):');
    if (!name) return;

    const newSubsection: ServiceSubsection = {
      id: Date.now().toString(),
      name,
      slides: [],
    };

    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.map(section =>
        section.id === sectionId
          ? { ...section, subsections: [...section.subsections, newSubsection] }
          : section
      ) || [],
    } : null);
    
    setSelectedSubsection(newSubsection.id);
    toast.success('Subsection added');
  };

  const handleAddScriptureSlide = async () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }

    const reference = prompt('Enter scripture reference (e.g., John 3:16):');
    if (!reference) return;

    const verse = await BibleParser.parseReference(reference);
    if (!verse) {
      toast.error('Invalid scripture reference');
      return;
    }

    const newSlide: ScriptureSlide = {
      id: Date.now().toString(),
      type: 'scripture',
      title: `${verse.book} ${verse.chapter}:${verse.verse}`,
      verse,
    };

    addSlideToSubsection(newSlide);
    toast.success('Scripture slide added');
  };

  const handleAddLyricsSlide = () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    setEditingSlide({
      type: 'lyrics',
      songTitle: '',
      content: '',
    });
  };

  const handleSaveLyricsSlide = () => {
    if (!editingSlide || editingSlide.type !== 'lyrics') return;

    const slides: LyricsSlide[] = [];
    const sections = editingSlide.content?.split('\n\n') || [];
    
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      const sectionName = lines[0].toLowerCase().includes('verse') ? 'verse' :
                         lines[0].toLowerCase().includes('chorus') ? 'chorus' :
                         lines[0].toLowerCase().includes('bridge') ? 'bridge' : undefined;
      
      const content = sectionName ? lines.slice(1).join('\n') : section;
      
      const slide: LyricsSlide = {
        id: `${Date.now()}-${index}`,
        type: 'lyrics',
        title: `${editingSlide.songTitle} - Slide ${index + 1}`,
        songTitle: editingSlide.songTitle || 'Untitled',
        slideNumber: index + 1,
        totalSlides: sections.length,
        content: content.trim(),
        section: sectionName,
      };
      slides.push(slide);
    });

    slides.forEach(slide => addSlideToSubsection(slide));
    setEditingSlide(null);
    toast.success('Lyrics slides added');
  };

  const handleAddImageSlide = () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }

    if (media.filter(m => m.type === 'image').length === 0) {
      toast.error('No images in library', {
        description: 'Upload images in Media Library first',
      });
      return;
    }
    
    const imageMedia = media.filter(m => m.type === 'image');
    const imageList = imageMedia.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
    const selection = prompt(`Select image:\n${imageList}\n\nEnter number:`);
    
    if (!selection) return;
    
    const index = parseInt(selection) - 1;
    const selectedImage = imageMedia[index];
    
    if (!selectedImage || !selectedImage.url) {
      toast.error('Invalid selection');
      return;
    }

    const newSlide: ImageSlide = {
      id: Date.now().toString(),
      type: 'image',
      title: selectedImage.name,
      imageUrl: selectedImage.url,
    };

    addSlideToSubsection(newSlide);
    toast.success('Image slide added');
  };

  const handlePPTXImport = (slides: ImageSlide[]) => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    slides.forEach(slide => addSlideToSubsection(slide));
  };

  const addSlideToSubsection = (slide: Slide) => {
    if (!selectedSubsection) return;

    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.map(section => ({
        ...section,
        subsections: section.subsections.map(sub =>
          sub.id === selectedSubsection
            ? { ...sub, slides: [...sub.slides, slide] }
            : sub
        ),
      })) || [],
    } : null);
  };

  const handleDeleteSlide = (sectionId: string, subsectionId: string, slideId: string) => {
    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.map(section =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.map(sub =>
                sub.id === subsectionId
                  ? { ...sub, slides: sub.slides.filter(s => s.id !== slideId) }
                  : sub
              ),
            }
          : section
      ) || [],
    } : null);
    toast.success('Slide deleted');
  };

  const handleDeleteSubsection = (sectionId: string, subsectionId: string) => {
    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.map(section =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.filter(sub => sub.id !== subsectionId),
            }
          : section
      ) || [],
    } : null);
    toast.success('Subsection deleted');
  };

  const handleDeleteSection = (sectionId: string) => {
    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.filter(s => s.id !== sectionId) || [],
    } : null);
    toast.success('Section deleted');
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.map(section =>
        section.id === sectionId
          ? { ...section, collapsed: !section.collapsed }
          : section
      ) || [],
    } : null);
  };

  const handleUpdateSlide = (sectionId: string, subsectionId: string, updatedSlide: Slide) => {
    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.map(section =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.map(sub =>
                sub.id === subsectionId
                  ? { ...sub, slides: sub.slides.map(s => s.id === updatedSlide.id ? updatedSlide : s) }
                  : sub
              ),
            }
          : section
      ) || [],
    } : null);
    toast.success('Slide updated');
  };

  const handleUpdateCountdown = (sectionId: string, subsectionId: string, countdown: any) => {
    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.map(section =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.map(sub =>
                sub.id === subsectionId
                  ? { ...sub, countdown }
                  : sub
              ),
            }
          : section
      ) || [],
    } : null);
  };

  if (!service) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Service Builder</h1>
            <p className="text-muted-foreground">{service.name}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveAsTemplate} variant="outline">
              Save as Template
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={() => navigate('/service-planner')}>
              Back
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Add Content */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Add Content</h2>
            
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Sections</Label>
                <Button onClick={handleAddSection} variant="outline" className="w-full justify-start">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Main Section
                </Button>
              </div>

              {selectedSection && (
                <div>
                  <Label className="mb-2 block">Subsections</Label>
                  <Button
                    onClick={() => handleAddSubsection(selectedSection)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <FilePlus className="w-4 h-4 mr-2" />
                    Add Subsection
                  </Button>
                </div>
              )}

              {selectedSubsection && (
                <>
                  <div className="border-t pt-4">
                    <Label className="mb-2 block">Add Slides</Label>
                    <div className="space-y-2">
                      <Button onClick={handleAddScriptureSlide} variant="outline" className="w-full justify-start">
                        <Book className="w-4 h-4 mr-2" />
                        Scripture
                      </Button>
                      <Button onClick={handleAddLyricsSlide} variant="outline" className="w-full justify-start">
                        <Music className="w-4 h-4 mr-2" />
                        Song Lyrics
                      </Button>
                      <Button onClick={handleAddImageSlide} variant="outline" className="w-full justify-start">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Image
                      </Button>
                      <PPTXImport onImport={handlePPTXImport} />
                    </div>
                  </div>
                </>
              )}

              <div className="border-t pt-4">
                <Label>Service Info</Label>
                <Input
                  value={service.name}
                  onChange={(e) => setService({...service, name: e.target.value})}
                  className="mt-2 mb-2"
                  placeholder="Service name"
                />
                <Input
                  type="time"
                  value={service.startTime}
                  onChange={(e) => setService({...service, startTime: e.target.value})}
                  className="mt-2"
                />
              </div>
            </div>
          </Card>

          {/* Right Panel - Service Structure */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">
              Service Structure
            </h2>

            {(!service.sections || service.sections.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground">
                No sections yet. Add your first section to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {service.sections.map((section) => (
                  <Collapsible
                    key={section.id}
                    open={!section.collapsed}
                    onOpenChange={() => toggleSectionCollapse(section.id)}
                  >
                    <Card className={`${selectedSection === section.id ? 'border-primary' : ''}`}>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <CollapsibleTrigger asChild>
                              <Button size="sm" variant="ghost">
                                {section.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                            </CollapsibleTrigger>
                            <button
                              onClick={() => setSelectedSection(section.id)}
                              className="flex-1 text-left font-semibold text-lg"
                            >
                              {section.name}
                            </button>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddSubsection(section.id)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteSection(section.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <CollapsibleContent className="mt-4">
                          <div className="space-y-2 ml-8">
                            {section.subsections.map((subsection) => (
                              <Card
                                key={subsection.id}
                                className={`p-3 ${selectedSubsection === subsection.id ? 'border-primary bg-primary/5' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <button
                                    onClick={() => setSelectedSubsection(subsection.id)}
                                    className="flex-1 text-left font-medium"
                                  >
                                    {subsection.name}
                                  </button>
                                  <div className="flex gap-1">
                                    <CountdownConfiguration
                                      config={subsection.countdown}
                                      onUpdate={(config) => handleUpdateCountdown(section.id, subsection.id, config)}
                                    />
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteSubsection(section.id, subsection.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>

                                {subsection.slides.length > 0 && (
                                  <div className="space-y-1 mt-2 pl-4 border-l-2 border-border">
                                    {subsection.slides.map((slide) => (
                                      <div key={slide.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                        <div className="flex items-center gap-2 flex-1">
                                          {slide.type === 'scripture' && <Book className="w-3 h-3 text-primary" />}
                                          {slide.type === 'lyrics' && <Music className="w-3 h-3 text-primary" />}
                                          {slide.type === 'image' && <ImageIcon className="w-3 h-3 text-primary" />}
                                          <span className="text-sm">{slide.title}</span>
                                        </div>
                                        <div className="flex gap-1">
                                          <SlideConfiguration
                                            slide={slide}
                                            onUpdate={(updated) => handleUpdateSlide(section.id, subsection.id, updated)}
                                          />
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteSlide(section.id, subsection.id, slide.id)}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </Card>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Lyrics Editor Modal */}
        {editingSlide?.type === 'lyrics' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl p-6">
              <h2 className="text-2xl font-semibold mb-4">Add Song Lyrics</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="song-title">Song Title</Label>
                  <Input
                    id="song-title"
                    value={(editingSlide as any).songTitle || ''}
                    onChange={(e) => setEditingSlide({...editingSlide, songTitle: e.target.value})}
                    placeholder="Amazing Grace"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="lyrics-content">Lyrics</Label>
                  <Textarea
                    id="lyrics-content"
                    value={(editingSlide as any).content || ''}
                    onChange={(e) => setEditingSlide({...editingSlide, content: e.target.value})}
                    placeholder="Verse 1&#10;Amazing grace how sweet the sound&#10;&#10;Chorus&#10;How precious did that grace appear&#10;&#10;Separate slides with double line breaks"
                    className="mt-2 h-64 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Use double line breaks to separate slides. Label sections as "Verse", "Chorus", "Bridge"
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingSlide(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveLyricsSlide}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Slides
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceBuilder;
