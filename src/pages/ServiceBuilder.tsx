import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Service, Slide, ScriptureSlide, LyricsSlide, ImageSlide, AnnouncementSlide, BlankSlide, ServiceSection, ServiceSubsection } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { BibleParser } from '@/lib/bibleParser';
import { BibleVerse } from '@/types/bible';
import { Book, Music, Image as ImageIcon, Plus, Trash2, Save, Copy, ChevronDown, ChevronRight, FolderPlus, FilePlus, GripVertical, Upload, StickyNote, MessageSquare, FileQuestion, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { SlideConfiguration } from '@/components/SlideConfiguration';
import { CountdownConfiguration } from '@/components/CountdownConfig';
import { ManualSearch } from '@/components/ManualSearch';
import { PPTXImport } from '@/components/PPTXImport';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Sortable wrapper for sections
function SortableSection({ section, children }: { section: ServiceSection; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-4 hover:text-primary">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

// Sortable wrapper for subsections
function SortableSubsection({ subsection, children }: { subsection: ServiceSubsection; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subsection.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-3 hover:text-primary">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

// Sortable wrapper for slides
function SortableSlide({ slide, children }: { slide: Slide; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:text-primary">
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

const ServiceBuilder = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [editingSlide, setEditingSlide] = useState<Partial<Slide> | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubsection, setSelectedSubsection] = useState<string | null>(null);
  const [notesDialog, setNotesDialog] = useState<{ type: 'section' | 'subsection' | 'slide'; id: string; sectionId?: string; subsectionId?: string } | null>(null);
  const [notesContent, setNotesContent] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const media = ServiceStorage.getMedia();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (serviceId) {
      const services = ServiceStorage.getServices();
      const found = services.find(s => s.id === serviceId);
      if (found) {
        setService(found);
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
    const name = prompt('Enter section name (e.g., "Worship", "Sermon"):') || 'New Section';
    const newSection: ServiceSection = {
      id: `section-${Date.now()}`,
      name,
      subsections: [],
    };
    setService(prev => prev ? { ...prev, sections: [...(prev.sections || []), newSection] } : null);
    setSelectedSection(newSection.id);
    toast.success('Section added');
  };

  const handleDuplicateSection = (section: ServiceSection) => {
    const duplicated: ServiceSection = {
      ...section,
      id: `section-${Date.now()}`,
      name: `${section.name} (Copy)`,
      subsections: section.subsections.map((sub, idx) => ({
        ...sub,
        id: `subsection-${Date.now()}-${idx}`,
        slides: sub.slides.map((slide, slideIdx) => ({
          ...slide,
          id: `slide-${Date.now()}-${idx}-${slideIdx}`,
        })),
      })),
    };
    setService(prev => prev ? {
      ...prev,
      sections: [...(prev.sections || []), duplicated],
    } : null);
    toast.success('Section duplicated');
  };

  const handleAddSubsection = (sectionId: string) => {
    const name = prompt('Enter subsection name (e.g., song title, testimony name):') || 'New Subsection';
    const newSubsection: ServiceSubsection = {
      id: `subsection-${Date.now()}`,
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

  const handleDuplicateSubsection = (sectionId: string, subsection: ServiceSubsection) => {
    const duplicated: ServiceSubsection = {
      ...subsection,
      id: `subsection-${Date.now()}`,
      name: `${subsection.name} (Copy)`,
      slides: subsection.slides.map((slide, idx) => ({
        ...slide,
        id: `slide-${Date.now()}-${idx}`,
      })),
    };
    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.map(section =>
        section.id === sectionId
          ? { ...section, subsections: [...section.subsections, duplicated] }
          : section
      ) || [],
    } : null);
    toast.success('Subsection duplicated');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newSlide: ImageSlide = {
          id: `slide-${Date.now()}-${Math.random()}`,
          type: 'image',
          title: file.name,
          imageUrl: e.target?.result as string,
        };
        addSlideToSubsection(newSlide);
      };
      reader.readAsDataURL(file);
    }
    toast.success(`${files.length} image(s) uploaded`);
    event.target.value = '';
  };

  const handleVerseSelect = (verse: BibleVerse) => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    const newSlide: ScriptureSlide = {
      id: `slide-${Date.now()}`,
      type: 'scripture',
      title: `${verse.book} ${verse.chapter}:${verse.verse}`,
      verse,
    };
    addSlideToSubsection(newSlide);
    toast.success('Scripture slide added');
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
      id: `slide-${Date.now()}`,
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
    setEditingSlide({ type: 'lyrics', songTitle: '', content: '' });
  };

  const handleAddAnnouncementSlide = () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    setEditingSlide({ type: 'announcement', title: '', content: '' });
  };

  const handleAddBlankSlide = () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    const newSlide: BlankSlide = {
      id: `slide-${Date.now()}`,
      type: 'blank',
      title: 'Blank Slide',
      placeholder: 'Click edit to set content',
    };
    addSlideToSubsection(newSlide);
    toast.success('Blank slide added');
  };

  const handleEditSlide = (sectionId: string, subsectionId: string, slide: Slide) => {
    setEditingSlide({
      ...slide,
      _editContext: { sectionId, subsectionId }
    } as any);
  };

  const handleSaveLyricsSlide = () => {
    if (!editingSlide || editingSlide.type !== 'lyrics') return;
    
    const context = (editingSlide as any)._editContext;
    
    // If editing existing slide
    if (editingSlide.id && context) {
      const updatedSlide: LyricsSlide = {
        ...(editingSlide as LyricsSlide),
        songTitle: editingSlide.songTitle || 'Untitled',
        content: editingSlide.content || '',
      };
      handleUpdateSlide(context.sectionId, context.subsectionId, updatedSlide);
      setEditingSlide(null);
      return;
    }

    // Creating new slides
    const slides: LyricsSlide[] = [];
    const sections = editingSlide.content?.split('\n\n') || [];
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      const sectionName = lines[0].toLowerCase().includes('verse') ? 'verse' :
                         lines[0].toLowerCase().includes('chorus') ? 'chorus' :
                         lines[0].toLowerCase().includes('bridge') ? 'bridge' : undefined;
      const content = sectionName ? lines.slice(1).join('\n') : section;
      const slide: LyricsSlide = {
        id: `slide-${Date.now()}-${index}`,
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

  const handleSaveAnnouncementSlide = () => {
    if (!editingSlide || editingSlide.type !== 'announcement') return;
    
    const context = (editingSlide as any)._editContext;
    
    // If editing existing slide
    if (editingSlide.id && context) {
      const updatedSlide: AnnouncementSlide = {
        ...(editingSlide as AnnouncementSlide),
        title: editingSlide.title || 'Announcement',
        content: editingSlide.content || '',
      };
      handleUpdateSlide(context.sectionId, context.subsectionId, updatedSlide);
      setEditingSlide(null);
      return;
    }

    // Creating new slide
    const newSlide: AnnouncementSlide = {
      id: `slide-${Date.now()}`,
      type: 'announcement',
      title: editingSlide.title || 'Announcement',
      content: editingSlide.content || '',
      imageUrl: editingSlide.imageUrl,
    };
    addSlideToSubsection(newSlide);
    setEditingSlide(null);
    toast.success('Announcement slide added');
  };

  const handleAddImageSlide = () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    if (media.filter(m => m.type === 'image').length === 0) {
      toast.error('No images in library', { description: 'Upload images in Media Library first' });
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
      id: `slide-${Date.now()}`,
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
          sub.id === selectedSubsection ? { ...sub, slides: [...sub.slides, slide] } : sub
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
          ? { ...section, subsections: section.subsections.filter(sub => sub.id !== subsectionId) }
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
        section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section
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
                sub.id === subsectionId ? { ...sub, countdown } : sub
              ),
            }
          : section
      ) || [],
    } : null);
  };

  const openNotesDialog = (type: 'section' | 'subsection' | 'slide', id: string, sectionId?: string, subsectionId?: string) => {
    let currentNotes = '';
    if (type === 'section') {
      currentNotes = service?.sections?.find(s => s.id === id)?.operatorNotes || '';
    } else if (type === 'subsection' && sectionId) {
      const section = service?.sections?.find(s => s.id === sectionId);
      currentNotes = section?.subsections?.find(sub => sub.id === id)?.presenterNotes || '';
    } else if (type === 'slide' && sectionId && subsectionId) {
      const section = service?.sections?.find(s => s.id === sectionId);
      const subsection = section?.subsections?.find(sub => sub.id === subsectionId);
      currentNotes = subsection?.slides?.find(slide => slide.id === id)?.slideNotes || '';
    }
    setNotesContent(currentNotes);
    setNotesDialog({ type, id, sectionId, subsectionId });
  };

  const saveNotes = () => {
    if (!notesDialog) return;
    const { type, id, sectionId, subsectionId } = notesDialog;
    
    setService(prev => {
      if (!prev) return null;
      if (type === 'section') {
        return {
          ...prev,
          sections: prev.sections?.map(s => s.id === id ? { ...s, operatorNotes: notesContent } : s) || [],
        };
      } else if (type === 'subsection' && sectionId) {
        return {
          ...prev,
          sections: prev.sections?.map(section =>
            section.id === sectionId
              ? {
                  ...section,
                  subsections: section.subsections.map(sub =>
                    sub.id === id ? { ...sub, presenterNotes: notesContent } : sub
                  ),
                }
              : section
          ) || [],
        };
      } else if (type === 'slide' && sectionId && subsectionId) {
        return {
          ...prev,
          sections: prev.sections?.map(section =>
            section.id === sectionId
              ? {
                  ...section,
                  subsections: section.subsections.map(sub =>
                    sub.id === subsectionId
                      ? {
                          ...sub,
                          slides: sub.slides.map(slide =>
                            slide.id === id ? { ...slide, slideNotes: notesContent } : slide
                          ),
                        }
                      : sub
                  ),
                }
              : section
          ) || [],
        };
      }
      return prev;
    });
    setNotesDialog(null);
    toast.success('Notes saved');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent, context: 'section' | 'subsection' | 'slide', sectionId?: string, subsectionId?: string) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setService(prev => {
      if (!prev) return null;

      if (context === 'section') {
        const oldIndex = prev.sections.findIndex(s => s.id === active.id);
        const newIndex = prev.sections.findIndex(s => s.id === over.id);
        return { ...prev, sections: arrayMove(prev.sections, oldIndex, newIndex) };
      } else if (context === 'subsection' && sectionId) {
        return {
          ...prev,
          sections: prev.sections.map(section => {
            if (section.id !== sectionId) return section;
            const oldIndex = section.subsections.findIndex(sub => sub.id === active.id);
            const newIndex = section.subsections.findIndex(sub => sub.id === over.id);
            return { ...section, subsections: arrayMove(section.subsections, oldIndex, newIndex) };
          }),
        };
      } else if (context === 'slide' && sectionId && subsectionId) {
        return {
          ...prev,
          sections: prev.sections.map(section => {
            if (section.id !== sectionId) return section;
            return {
              ...section,
              subsections: section.subsections.map(sub => {
                if (sub.id !== subsectionId) return sub;
                const oldIndex = sub.slides.findIndex(slide => slide.id === active.id);
                const newIndex = sub.slides.findIndex(slide => slide.id === over.id);
                return { ...sub, slides: arrayMove(sub.slides, oldIndex, newIndex) };
              }),
            };
          }),
        };
      }
      return prev;
    });
  };

  const getSlideIcon = (slide: Slide) => {
    switch (slide.type) {
      case 'scripture': return <Book className="w-3 h-3" />;
      case 'lyrics': return <Music className="w-3 h-3" />;
      case 'image': return <ImageIcon className="w-3 h-3" />;
      case 'announcement': return <MessageSquare className="w-3 h-3" />;
      case 'blank': return <FileQuestion className="w-3 h-3" />;
      default: return null;
    }
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
                  <Button onClick={() => handleAddSubsection(selectedSection)} variant="outline" className="w-full justify-start">
                    <FilePlus className="w-4 h-4 mr-2" />
                    Add Subsection
                  </Button>
                </div>
              )}

              {selectedSubsection && (
                <>
                  <div className="border-t pt-4">
                    <Label className="mb-3 block">Add Slides</Label>
                    <div className="space-y-2">
                      <Button onClick={handleAddBlankSlide} variant="outline" className="w-full justify-start">
                        <FileQuestion className="w-4 h-4 mr-2" />
                        Blank Slide
                      </Button>
                      <Button onClick={handleAddScriptureSlide} variant="outline" className="w-full justify-start">
                        <Book className="w-4 h-4 mr-2" />
                        Scripture
                      </Button>
                      <Button onClick={handleAddLyricsSlide} variant="outline" className="w-full justify-start">
                        <Music className="w-4 h-4 mr-2" />
                        Song Lyrics
                      </Button>
                      <Button onClick={handleAddAnnouncementSlide} variant="outline" className="w-full justify-start">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Announcement
                      </Button>
                      <Button onClick={handleAddImageSlide} variant="outline" className="w-full justify-start">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Image
                      </Button>
                      <PPTXImport onImport={handlePPTXImport} />
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex items-center justify-start w-full px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload from Device
                        </div>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="mb-2 block">Quick Scripture Search</Label>
                    <ManualSearch onVerseSelect={handleVerseSelect} />
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

          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Service Structure</h2>
            {(!service.sections || service.sections.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground">
                No sections yet. Add your first section to get started.
              </div>
            ) : (
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragStart={handleDragStart}
                onDragEnd={(e) => handleDragEnd(e, 'section')}
              >
                <SortableContext items={service.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {service.sections.map((section) => (
                      <SortableSection key={section.id} section={section}>
                        <Collapsible open={!section.collapsed} onOpenChange={() => toggleSectionCollapse(section.id)}>
                          <Card className={`${selectedSection === section.id ? 'border-primary' : ''} ${activeId === section.id ? 'ring-2 ring-primary' : ''}`}>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                  <CollapsibleTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      {section.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <button onClick={() => setSelectedSection(section.id)} className="flex-1 text-left font-semibold text-lg">
                                    {section.name}
                                  </button>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" onClick={() => openNotesDialog('section', section.id)} title="Operator Notes">
                                    <StickyNote className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDuplicateSection(section)} title="Duplicate Section">
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleAddSubsection(section.id)} title="Add Subsection">
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteSection(section.id)} title="Delete Section">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              <CollapsibleContent className="mt-4">
                                <DndContext 
                                  sensors={sensors} 
                                  collisionDetection={closestCenter} 
                                  onDragStart={handleDragStart}
                                  onDragEnd={(e) => handleDragEnd(e, 'subsection', section.id)}
                                >
                                  <SortableContext items={section.subsections.map(sub => sub.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2 ml-8">
                                      {section.subsections.map((subsection) => (
                                        <SortableSubsection key={subsection.id} subsection={subsection}>
                                          <Card className={`p-3 ${selectedSubsection === subsection.id ? 'border-primary bg-primary/5' : ''} ${activeId === subsection.id ? 'ring-2 ring-primary' : ''}`}>
                                            <div className="flex items-center justify-between mb-2">
                                              <button onClick={() => setSelectedSubsection(subsection.id)} className="flex-1 text-left font-medium">
                                                {subsection.name}
                                              </button>
                                              <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => openNotesDialog('subsection', subsection.id, section.id)} title="Presenter Notes">
                                                  <StickyNote className="w-3 h-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDuplicateSubsection(section.id, subsection)} title="Duplicate">
                                                  <Copy className="w-3 h-3" />
                                                </Button>
                                                <CountdownConfiguration
                                                  config={subsection.countdown}
                                                  onUpdate={(countdown) => handleUpdateCountdown(section.id, subsection.id, countdown)}
                                                />
                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteSubsection(section.id, subsection.id)} title="Delete">
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>

                                            {subsection.slides.length > 0 && (
                                              <DndContext 
                                                sensors={sensors} 
                                                collisionDetection={closestCenter} 
                                                onDragStart={handleDragStart}
                                                onDragEnd={(e) => handleDragEnd(e, 'slide', section.id, subsection.id)}
                                              >
                                                <SortableContext items={subsection.slides.map(slide => slide.id)} strategy={verticalListSortingStrategy}>
                                                  <div className="ml-4 space-y-1">
                                                    {subsection.slides.map((slide) => (
                                                      <SortableSlide key={slide.id} slide={slide}>
                                                        <div className={`flex items-center justify-between text-sm py-1 px-2 rounded ${activeId === slide.id ? 'bg-primary/10 ring-1 ring-primary' : ''}`}>
                                                          <div className="flex items-center gap-2 flex-1 truncate">
                                                            {getSlideIcon(slide)}
                                                            <span className="truncate">{slide.title}</span>
                                                          </div>
                                                          <div className="flex gap-1">
                                                            <Button size="sm" variant="ghost" onClick={() => openNotesDialog('slide', slide.id, section.id, subsection.id)} title="Slide Notes">
                                                              <StickyNote className="w-3 h-3" />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" onClick={() => handleEditSlide(section.id, subsection.id, slide)} title="Edit Slide">
                                                              <Pencil className="w-3 h-3" />
                                                            </Button>
                                                            <SlideConfiguration slide={slide} onUpdate={(updated) => handleUpdateSlide(section.id, subsection.id, updated)} />
                                                            <Button size="sm" variant="ghost" onClick={() => handleDeleteSlide(section.id, subsection.id, slide.id)} title="Delete">
                                                              <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      </SortableSlide>
                                                    ))}
                                                  </div>
                                                </SortableContext>
                                              </DndContext>
                                            )}
                                          </Card>
                                        </SortableSubsection>
                                      ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                              </CollapsibleContent>
                            </div>
                          </Card>
                        </Collapsible>
                      </SortableSection>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Card>
        </div>
      </div>

      {/* Lyrics Editor Dialog */}
      {editingSlide?.type === 'lyrics' && (
        <Dialog open={true} onOpenChange={() => setEditingSlide(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSlide.id ? 'Edit Song Lyrics' : 'Add Song Lyrics'}</DialogTitle>
              <DialogDescription>Separate verses/sections with blank lines</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Song Title</Label>
                <Input
                  value={editingSlide.songTitle || ''}
                  onChange={(e) => setEditingSlide({...editingSlide, songTitle: e.target.value})}
                  placeholder="Enter song title"
                />
              </div>
              <div>
                <Label>Lyrics</Label>
                <Textarea
                  value={editingSlide.content || ''}
                  onChange={(e) => setEditingSlide({...editingSlide, content: e.target.value})}
                  placeholder="Verse 1&#10;First line&#10;Second line&#10;&#10;Chorus&#10;Chorus lyrics..."
                  className="min-h-[300px] font-mono"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSlide(null)}>Cancel</Button>
              <Button onClick={handleSaveLyricsSlide}>Save Lyrics</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Announcement Editor Dialog */}
      {editingSlide?.type === 'announcement' && (
        <Dialog open={true} onOpenChange={() => setEditingSlide(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSlide.id ? 'Edit Announcement' : 'Add Announcement'}</DialogTitle>
              <DialogDescription>Create an announcement slide</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingSlide.title || ''}
                  onChange={(e) => setEditingSlide({...editingSlide, title: e.target.value})}
                  placeholder="Enter announcement title"
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={editingSlide.content || ''}
                  onChange={(e) => setEditingSlide({...editingSlide, content: e.target.value})}
                  placeholder="Enter announcement content..."
                  className="min-h-[200px]"
                />
              </div>
              <div>
                <Label>Background Image (optional)</Label>
                <Select 
                  value={editingSlide.imageUrl || ''} 
                  onValueChange={(value) => setEditingSlide({...editingSlide, imageUrl: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select image" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No image</SelectItem>
                    {media.filter(m => m.type === 'image').map(m => (
                      <SelectItem key={m.id} value={m.url || ''}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSlide(null)}>Cancel</Button>
              <Button onClick={handleSaveAnnouncementSlide}>Save Announcement</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Notes Dialog */}
      {notesDialog && (
        <Dialog open={true} onOpenChange={() => setNotesDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {notesDialog.type === 'section' && 'Operator Notes (Private)'}
                {notesDialog.type === 'subsection' && 'Presenter Notes (Confidence Monitor)'}
                {notesDialog.type === 'slide' && 'Slide Notes'}
              </DialogTitle>
              <DialogDescription>
                {notesDialog.type === 'section' && 'Private notes for operators only'}
                {notesDialog.type === 'subsection' && 'Visible on confidence monitor'}
                {notesDialog.type === 'slide' && 'Notes for this specific slide'}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              placeholder="Enter notes..."
              className="min-h-[200px]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancel</Button>
              <Button onClick={saveNotes}>Save Notes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ServiceBuilder;