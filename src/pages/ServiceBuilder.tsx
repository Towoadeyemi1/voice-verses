import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LAST_SERVICE_KEY } from '@/lib/serviceStorage';
import { addVideoToLibrary } from '@/lib/mediaFiles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Service, Slide, ScriptureSlide, LyricsSlide, ImageSlide, VideoSlide, AnnouncementSlide, BlankSlide, ServiceSection, ServiceSubsection, MediaItem } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { BibleParser } from '@/lib/bibleParser';
import { BibleVerse } from '@/types/bible';
import { Book, Music, Image as ImageIcon, Film, Plus, Trash2, Save, Copy, ChevronDown, ChevronRight, FolderPlus, FilePlus, GripVertical, Upload, StickyNote, MessageSquare, FileQuestion, Pencil, MoreVertical, Settings, Sparkles, Palette, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { SlideConfiguration } from '@/components/SlideConfiguration';
import { CountdownConfiguration } from '@/components/CountdownConfig';
import { ManualSearch } from '@/components/ManualSearch';
import { LyricsEditor } from '@/components/LyricsEditor';
import { AiSlidesDialog } from '@/components/AiSlidesDialog';
import { DesignSlideDialog } from '@/components/designer/DesignSlideDialog';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppShell, Section } from '@/components/shell/AppShell';
import { colorFor } from '@/components/live/ServiceTimeline';
import { ScaledStage } from '@/components/ScaledStage';
import { OutputContent } from '@/components/OutputContent';
import { SettingsPanel } from '@/components/SettingsPanel';
import { DisplayMonitor } from '@/components/DisplayMonitor';
import { SortableSection, SortableSubsection, SortableSlide } from '@/components/service-builder/SortableItems';
import { NotesDialog } from '@/components/service-builder/NotesDialog';
import { ScriptureReferenceDialog } from '@/components/service-builder/ScriptureReferenceDialog';
import { WORSHIP_SONGS_TEMPLATE, parseWorshipSongsCsv, addSongsToWorshipSection } from '@/lib/worshipSongImport';

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
  const [showScriptureDialog, setShowScriptureDialog] = useState(false);
  const [scriptureReference, setScriptureReference] = useState('');
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [showAiSlides, setShowAiSlides] = useState(false);
  const [designing, setDesigning] = useState<{ slide: Slide; sectionId: string; subsectionId: string } | null>(null);
  const [editingLyricsContext, setEditingLyricsContext] = useState<{ sectionId: string; subsectionId: string; songTitle: string } | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);

  useEffect(() => {
    ServiceStorage.getMedia().then(setMedia);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (serviceId) {
      ServiceStorage.getServices().then(services => {
        const found = services.find(s => s.id === serviceId);
        if (found) {
          setService(found);
          // The Presenter opens the service being worked on
          localStorage.setItem(LAST_SERVICE_KEY, found.id);
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
      });
    }
  }, [serviceId, navigate]);

  const handleSave = async () => {
    console.log('handleSave called', { service, serviceId: service?.id });
    if (service) {
      try {
        await ServiceStorage.saveService(service);
        console.log('Service saved successfully');
        toast.success('Service saved');
      } catch (error) {
        console.error('Error saving service:', error);
        toast.error('Failed to save service');
      }
    } else {
      console.error('No service to save');
      toast.error('No service to save');
    }
  };

  const handleCreateNewService = () => {
    navigate('/service-planner');
  };

  const handleSaveAsTemplate = async () => {
    if (!service) return;
    const templateName = prompt('Enter template name:');
    if (!templateName) return;
    const template: Service = {
      ...service,
      id: `template-${Date.now()}`,
      isTemplate: true,
      templateName,
    };
    await ServiceStorage.saveService(template);
    toast.success('Template saved');
  };

  const handleAddSection = () => {
    const newSection: ServiceSection = {
      id: `section-${Date.now()}`,
      name: 'New Section',
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
    const newSubsection: ServiceSubsection = {
      id: `subsection-${Date.now()}`,
      name: 'New Item',
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
    toast.success('Item added');
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

  /** Pictures as slides, one each, in the order of their names (Slide1, Slide2 … Slide10, as PowerPoint exports them), whatever order they were picked in */
  const addPictureFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? [])
      .filter((file) => file.type.startsWith('image/') || (toast.error(`${file.name} is not an image`), false))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    if (!files.length) return;
    const urls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );
    const stamp = Date.now();
    files.forEach((file, i) =>
      addSlideToSubsection({ id: `slide-${stamp}-${i}`, type: 'image', title: file.name.replace(/\.[^/.]+$/, ''), imageUrl: urls[i] } as ImageSlide),
    );
    toast.success(`${files.length} picture${files.length > 1 ? 's' : ''} added, in order of their names`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }

    await addPictureFiles(event.target.files);
    event.target.value = '';
  };

  const handleVerseSelect = async (verse: BibleVerse) => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    
    // Import the splitter utility
    const { splitScriptureSlide } = await import('@/lib/slideContentSplitter');
    
    // Split the verse if it's too long
    const slides = splitScriptureSlide(verse, 'large');
    slides.forEach(slide => addSlideToSubsection(slide));
    
    if (slides.length > 1) {
      toast.success(`Scripture split into ${slides.length} slides`);
    } else {
      toast.success('Scripture slide added');
    }
  };

  const handleAddScriptureSlide = () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    setShowScriptureDialog(true);
  };

  const handleScriptureSubmit = async () => {
    if (!scriptureReference.trim()) return;
    
    const verses = await BibleParser.parseReferenceRange(scriptureReference);
    if (!verses || verses.length === 0) {
      toast.error('Invalid scripture reference');
      return;
    }

    // Import the splitter utility
    const { splitScriptureSlide } = await import('@/lib/slideContentSplitter');
    
    let totalSlidesAdded = 0;
    
    // Create slides for each verse, automatically splitting if text is too long
    verses.forEach(verse => {
      const slides = splitScriptureSlide(verse, 'large');
      slides.forEach(slide => addSlideToSubsection(slide));
      totalSlidesAdded += slides.length;
    });
    
    toast.success(`Added ${totalSlidesAdded} scripture slide${totalSlidesAdded > 1 ? 's' : ''}`);
    setScriptureReference('');
    setShowScriptureDialog(false);
  };

  const handleAddLyricsSlide = () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    setShowLyricsEditor(true);
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
    // For lyrics slides, open the full lyrics editor
    if (slide.type === 'lyrics') {
      const lyricsSlide = slide as LyricsSlide;
      setEditingLyricsContext({ sectionId, subsectionId, songTitle: lyricsSlide.songTitle });
      setShowLyricsEditor(true);
      return;
    }
    
    // For blank slides, let user choose the slide type first
    if (slide.type === 'blank') {
      setEditingSlide({
        id: slide.id,
        type: 'blank',
        title: slide.title,
        _editContext: { sectionId, subsectionId },
        _isConverting: true,
      } as any);
    } else {
      setEditingSlide({
        ...slide,
        _editContext: { sectionId, subsectionId }
      } as any);
    }
  };

  const handleSaveLyricsFromEditor = (slides: LyricsSlide[], subsectionBackground?: { type: 'image'; url: string; opacity: number }) => {
    // If editing existing lyrics, replace the old slides
    if (editingLyricsContext && service) {
      const { sectionId, subsectionId, songTitle } = editingLyricsContext;
      
      setService(prev => {
        if (!prev) return null;
        return {
          ...prev,
          sections: prev.sections.map(section =>
            section.id === sectionId
              ? {
                  ...section,
                  subsections: section.subsections.map(sub =>
                    sub.id === subsectionId
                      ? {
                          ...sub,
                          slides: [
                            ...sub.slides.filter(s => s.type !== 'lyrics' || (s as LyricsSlide).songTitle !== songTitle),
                            ...slides
                          ],
                          backgroundMedia: subsectionBackground || sub.backgroundMedia,
                        }
                      : sub
                  ),
                }
              : section
          ),
        };
      });
      
      setEditingLyricsContext(null);
      setShowLyricsEditor(false);
      toast.success(`${slides.length} slide${slides.length !== 1 ? 's' : ''} updated`);
      return;
    }
    
    // Adding new lyrics
    if (!selectedSubsection) return;

    // Add all slides to the subsection
    slides.forEach(slide => addSlideToSubsection(slide));

    // If background media was provided, update the subsection
    if (subsectionBackground && service) {
      const updatedService = { ...service };
      for (const section of updatedService.sections) {
        const subsection = section.subsections.find(s => s.id === selectedSubsection);
        if (subsection) {
          subsection.backgroundMedia = subsectionBackground;
          break;
        }
      }
      setService(updatedService);
      ServiceStorage.saveService(updatedService);
    }

    setShowLyricsEditor(false);
    toast.success(`${slides.length} slide${slides.length !== 1 ? 's' : ''} added`);
  };

  const handleSaveAnnouncementSlide = async () => {
    if (!editingSlide || editingSlide.type !== 'announcement') return;
    
    const context = (editingSlide as any)._editContext;
    
    // Import the splitter utility
    const { splitAnnouncementSlide } = await import('@/lib/slideContentSplitter');
    
    // If editing existing slide
    if (editingSlide.id && context) {
      // Split the updated content
      const slides = splitAnnouncementSlide(
        editingSlide.title || 'Announcement',
        editingSlide.content || '',
        editingSlide.imageUrl,
        'large'
      );
      
      // If it results in multiple slides, need to replace old slide with new ones
      if (slides.length > 1) {
        // Remove the old slide and add all new split slides
        setService(prev => {
          if (!prev) return null;
          return {
            ...prev,
            sections: prev.sections?.map(section =>
              section.id === context.sectionId
                ? {
                    ...section,
                    subsections: section.subsections.map(sub =>
                      sub.id === context.subsectionId
                        ? {
                            ...sub,
                            slides: [
                              ...sub.slides.filter(s => s.id !== editingSlide.id),
                              ...slides
                            ]
                          }
                        : sub
                    )
                  }
                : section
            ) || []
          };
        });
        toast.success(`Announcement split into ${slides.length} slides`);
      } else {
        // Just update the single slide
        handleUpdateSlide(context.sectionId, context.subsectionId, slides[0]);
      }
      
      setEditingSlide(null);
      return;
    }

    // Creating new slide - split if content is too long
    const slides = splitAnnouncementSlide(
      editingSlide.title || 'Announcement',
      editingSlide.content || '',
      editingSlide.imageUrl,
      'large'
    );
    
    slides.forEach(slide => addSlideToSubsection(slide));
    setEditingSlide(null);
    
    if (slides.length > 1) {
      toast.success(`Announcement split into ${slides.length} slides`);
    } else {
      toast.success('Announcement slide added');
    }
  };

  const handleAddImageSlide = () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    
    // Create and trigger file input for image upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => void addPictureFiles((e.target as HTMLInputElement).files);
    input.click();
  };

  const handleAddVideoSlide = () => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      for (const [i, file] of files.entries()) {
        if (!file.type.startsWith('video/')) {
          toast.error(`${file.name} is not a video`);
          continue;
        }
        const item = await addVideoToLibrary(file);
        const slide: VideoSlide = { id: `slide-${Date.now()}-${i}`, type: 'video', title: item.name, mediaId: item.id, loop: false, sound: true };
        addSlideToSubsection(slide);
      }
      if (files.length) toast.success(`${files.length} video${files.length > 1 ? 's' : ''} added`);
    };
    input.click();
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([WORSHIP_SONGS_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'worship-songs-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleImportWorshipSongs = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error('Failed to read file');
      return;
    }

    const { songs, skipped } = parseWorshipSongsCsv(text);
    skipped.forEach(title => toast.warning(`"${title}" has no lyrics - skipped`));

    if (songs.length === 0) {
      toast.error('No songs with lyrics found in the file');
      return;
    }

    setService(prev => (prev ? addSongsToWorshipSection(prev, songs) : prev));
    toast.success(`Imported ${songs.length} song(s) to Worship section`);
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

  const handleUpdateSubsection = (sectionId: string, updatedSubsection: ServiceSubsection) => {
    setService(prev => prev ? {
      ...prev,
      sections: prev.sections?.map(section =>
        section.id === sectionId
          ? {
              ...section,
              subsections: section.subsections.map(sub =>
                sub.id === updatedSubsection.id ? updatedSubsection : sub
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

  const selectedPart = service.sections?.flatMap((sec) => sec.subsections).find((sub) => sub.id === selectedSubsection);
  const when = new Date(service.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <AppShell
      wide
      title={service.name || 'Untitled service'}
      subtitle={`${when} · starts ${service.startTime}`}
      actions={
        <>
          <Button onClick={handleSaveAsTemplate} variant="ghost" className="hidden sm:flex" title="Keep this order of service to start other services from">
            <Copy className="w-4 h-4" />
            Save as an order
          </Button>
          <Button variant="secondary" onClick={async () => { await handleSave(); navigate(`/presenter?service=${service.id}`); }}>
            <Monitor className="w-4 h-4" />
            Present
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4" />
            Save
          </Button>
        </>
      }
    >
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-6 lg:sticky lg:top-24">
            <Section title="Service">
              <div className="space-y-3">
                <Input value={service.name} onChange={(e) => setService({ ...service, name: e.target.value })} placeholder="Service name" aria-label="Service name" />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    type="date"
                    aria-label="Date"
                    value={service.date instanceof Date ? service.date.toISOString().split('T')[0] : new Date(service.date).toISOString().split('T')[0]}
                    onChange={(e) => setService({ ...service, date: new Date(e.target.value) })}
                  />
                  <Input type="time" aria-label="Start time" value={service.startTime} onChange={(e) => setService({ ...service, startTime: e.target.value })} className="w-32" />
                </div>
              </div>
            </Section>

            <Section
              title={selectedPart ? `Add to “${selectedPart.name}”` : 'Add to a part'}
              description={selectedPart ? undefined : 'Click a part of the service on the right, then add verses, songs and more to it.'}
            >
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['Scripture', Book, handleAddScriptureSlide],
                  ['Song', Music, handleAddLyricsSlide],
                  ['Announcement', MessageSquare, handleAddAnnouncementSlide],
                  ['Picture', ImageIcon, handleAddImageSlide],
                  ['Video', Film, handleAddVideoSlide],
                  ['Blank', FileQuestion, handleAddBlankSlide],
                ] as const).map(([label, Icon, add]) => (
                  <button
                    key={label}
                    type="button"
                    disabled={!selectedSubsection}
                    onClick={add}
                    className="h-[72px] rounded-xl bg-muted/50 hover:bg-muted flex flex-col items-center justify-center gap-1.5 text-sm font-medium transition disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button variant="secondary" disabled={!selectedSubsection} onClick={() => setShowAiSlides(true)}>
                  <Sparkles className="w-4 h-4" />
                  Make with AI
                </Button>
                <Button variant="secondary" disabled={!selectedSubsection} asChild={!!selectedSubsection}>
                  <label className="cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Pictures
                    <Input id="file-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                  </label>
                </Button>
              </div>
              {selectedSubsection && (
                <div className="mt-5">
                  <p className="m-0 mb-2 text-sm font-semibold">Find a verse</p>
                  <ManualSearch onVerseSelect={handleVerseSelect} />
                </div>
              )}
            </Section>

            <Section title="Order of service">
              <div className="space-y-2">
                <Button onClick={handleAddSection} variant="secondary" className="w-full justify-start">
                  <FolderPlus className="w-4 h-4" />
                  Add a section
                </Button>
                {selectedSection && (
                  <Button onClick={() => handleAddSubsection(selectedSection)} variant="secondary" className="w-full justify-start">
                    <FilePlus className="w-4 h-4" />
                    Add a part to this section
                  </Button>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="m-0 text-sm font-semibold">Songs from the worship team</p>
                <p className="m-0 mt-1 mb-2.5 text-xs text-muted-foreground">Fill in the spreadsheet and import it to add all the songs at once.</p>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadTemplate} variant="ghost" size="sm">Get the spreadsheet</Button>
                  <Button variant="ghost" size="sm" asChild>
                    <label htmlFor="worship-import" className="cursor-pointer">
                      <Music className="w-4 h-4" />
                      Import
                    </label>
                  </Button>
                  <Input id="worship-import" type="file" accept=".csv" className="hidden" onChange={handleImportWorshipSongs} />
                </div>
              </div>
            </Section>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="m-0 text-[17px] font-semibold">Order of service</h2>
              <Button onClick={handleAddSection} size="sm" variant="secondary">
                <FolderPlus className="w-4 h-4" />
                Add a section
              </Button>
            </div>
            {(!service.sections || service.sections.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderPlus className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No sections yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Get started by adding your first section. Sections help organize your service into parts like Worship, Sermon, or Announcements.
                </p>
                <Button onClick={handleAddSection} size="lg" className="gap-2">
                  <FolderPlus className="w-5 h-5" />
                  Add Your First Section
                </Button>
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
                      <SortableSection key={section.id} id={section.id}>
                        <Collapsible open={!section.collapsed} onOpenChange={() => toggleSectionCollapse(section.id)}>
                          <Card className={`overflow-hidden ${selectedSection === section.id ? 'ring-1 ring-foreground/30' : ''} ${activeId === section.id ? 'ring-2 ring-foreground/50' : ''}`}>
                            <div className="p-4 border-l-4" style={{ borderLeftColor: colorFor(section.name) }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                  <CollapsibleTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      {section.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <Input 
                                    value={section.name}
                                    onChange={(e) => {
                                      setService(prev => prev ? {
                                        ...prev,
                                        sections: prev.sections?.map(s => 
                                          s.id === section.id ? { ...s, name: e.target.value } : s
                                        ) || []
                                      } : null);
                                    }}
                                    onFocus={() => setSelectedSection(section.id)}
                                    className="flex-1 font-semibold text-[17px] h-auto py-1 bg-transparent border-transparent hover:border-input focus:border-input"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => openNotesDialog('section', section.id)} title="Notes for the operator">
                                    <StickyNote className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDuplicateSection(section)} title="Duplicate this section">
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSection(section.id)} title="Delete this section">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              <CollapsibleContent className="mt-4">
                                {section.subsections.length === 0 ? (
                                  <div className="text-center py-7 rounded-xl bg-muted/40">
                                    <p className="m-0 text-sm text-muted-foreground mb-3">No parts in this section yet</p>
                                    <Button onClick={() => handleAddSubsection(section.id)} variant="secondary" size="sm">
                                      <FilePlus className="w-4 h-4" />
                                      Add a part
                                    </Button>
                                  </div>
                                ) : (
                                <>
                                <DndContext
                                  sensors={sensors} 
                                  collisionDetection={closestCenter} 
                                  onDragStart={handleDragStart}
                                  onDragEnd={(e) => handleDragEnd(e, 'subsection', section.id)}
                                >
                                  <SortableContext items={section.subsections.map(sub => sub.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2 ml-8">
                                      {section.subsections.map((subsection) => (
                                        <SortableSubsection key={subsection.id} id={subsection.id}>
                                          <Card onClick={() => setSelectedSubsection(subsection.id)} className={`p-3 shadow-none transition ${selectedSubsection === subsection.id ? 'bg-muted/70 ring-1 ring-foreground/35' : 'bg-muted/35 hover:bg-muted/50'} ${activeId === subsection.id ? 'ring-2 ring-foreground/50' : ''}`}>
                                             <div className="flex items-center justify-between mb-2">
                                              <Input 
                                                value={subsection.name}
                                                onChange={(e) => {
                                                  setService(prev => prev ? {
                                                    ...prev,
                                                    sections: prev.sections?.map(s => 
                                                      s.id === section.id 
                                                        ? { 
                                                            ...s, 
                                                            subsections: s.subsections.map(sub =>
                                                              sub.id === subsection.id ? { ...sub, name: e.target.value } : sub
                                                            )
                                                          }
                                                        : s
                                                    ) || []
                                                  } : null);
                                                }}
                                                onFocus={() => setSelectedSubsection(subsection.id)}
                                                className="flex-1 font-medium h-auto py-1 bg-transparent border-transparent hover:border-input focus:border-input"
                                              />
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

                                            {subsection.slides.length === 0 ? (
                                              <div className="text-center py-5 rounded-xl bg-background/40 mt-2">
                                                <p className="text-xs text-muted-foreground mb-3">No slides yet. Add content:</p>
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                  <Button size="sm" variant="ghost" onClick={() => { setSelectedSubsection(subsection.id); handleAddScriptureSlide(); }}>
                                                    <Book className="w-3 h-3 mr-1" />
                                                    Scripture
                                                  </Button>
                                                  <Button size="sm" variant="ghost" onClick={() => { setSelectedSubsection(subsection.id); handleAddLyricsSlide(); }}>
                                                    <Music className="w-3 h-3 mr-1" />
                                                    Lyrics
                                                  </Button>
                                                  <Button size="sm" variant="ghost" onClick={() => { setSelectedSubsection(subsection.id); handleAddImageSlide(); }}>
                                                    <ImageIcon className="w-3 h-3 mr-1" />
                                                    Image
                                                  </Button>
                                                  <Button size="sm" variant="ghost" onClick={() => { setSelectedSubsection(subsection.id); handleAddVideoSlide(); }}>
                                                    <Film className="w-3 h-3 mr-1" />
                                                    Video
                                                  </Button>
                                                  <Button size="sm" variant="ghost" onClick={() => { setSelectedSubsection(subsection.id); handleAddAnnouncementSlide(); }}>
                                                    <MessageSquare className="w-3 h-3 mr-1" />
                                                    Announcement
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <DndContext 
                                                sensors={sensors} 
                                                collisionDetection={closestCenter} 
                                                onDragStart={handleDragStart}
                                                onDragEnd={(e) => handleDragEnd(e, 'slide', section.id, subsection.id)}
                                              >
                                                 <SortableContext items={subsection.slides.map(slide => slide.id)} strategy={verticalListSortingStrategy}>
                                                   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-3 auto-rows-fr">
                                                      {subsection.slides.map((slide) => (
                                                         <SortableSlide key={slide.id} id={slide.id}>
                                                           <Card className={`group relative overflow-hidden cursor-pointer flex flex-col min-h-0 h-full shadow-none bg-background/40 ${activeId === slide.id ? 'ring-2 ring-foreground/50' : ''}`}>
                                                             {/* Slide Preview with WYSIWYG */}
                                                             <div className="aspect-video bg-black relative overflow-hidden flex-shrink-0">
                                                              {/* Drawn by the projector's own renderer: what you see is what the room sees */}
                                                              <ScaledStage className="absolute inset-0">
                                                                <OutputContent live={{ slide }} output="projection" preview />
                                                              </ScaledStage>
                                                             {/* Drag Handle Overlay */}
                                                             <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                               <div className="bg-background/80 backdrop-blur-sm rounded p-1">
                                                                 <GripVertical className="w-3 h-3 text-muted-foreground" />
                                                               </div>
                                                             </div>
                                                           </div>
                                                            
                                                             {/* Slide Info & Actions */}
                                                             <div className="p-2 border-t flex-shrink-0">
                                                               <div className="text-xs font-medium truncate" title={slide.title}>
                                                                {slide.title}
                                                              </div>
                                                              
                                                              {/* Dropdown Menu for Actions */}
                                                              <div className="absolute top-2 right-2">
                                                                <DropdownMenu>
                                                                  <DropdownMenuTrigger asChild>
                                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                      <MoreVertical className="w-4 h-4" />
                                                                    </Button>
                                                                  </DropdownMenuTrigger>
                                                                  <DropdownMenuContent align="end" className="w-40 bg-background z-50">
                                                                    <DropdownMenuItem onClick={() => openNotesDialog('slide', slide.id, section.id, subsection.id)}>
                                                                      <StickyNote className="w-4 h-4 mr-2" />
                                                                      Notes
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleEditSlide(section.id, subsection.id, slide)}>
                                                                      <Pencil className="w-4 h-4 mr-2" />
                                                                      Edit
                                                                    </DropdownMenuItem>
                                                                    {(slide.type === 'scripture' || slide.type === 'lyrics' || slide.type === 'announcement') && (
                                                                      <DropdownMenuItem onClick={() => setDesigning({ slide, sectionId: section.id, subsectionId: subsection.id })}>
                                                                        <Palette className="w-4 h-4 mr-2" />
                                                                        Design…
                                                                      </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                      <Settings className="w-4 h-4 mr-2" />
                                                                      <SlideConfiguration slide={slide} onUpdate={(updated) => handleUpdateSlide(section.id, subsection.id, updated)} />
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDeleteSlide(section.id, subsection.id, slide.id)} className="text-destructive">
                                                                      <Trash2 className="w-4 h-4 mr-2" />
                                                                      Delete
                                                                    </DropdownMenuItem>
                                                                  </DropdownMenuContent>
                                                                </DropdownMenu>
                                                              </div>
                                                            </div>
                                                         </Card>
                                                       </SortableSlide>
                                                     ))}
                                                   </div>
                                                </SortableContext>
                                              </DndContext>
                                            )}

                                            {subsection.slides.length > 0 && (
                                              <div className="mt-3 flex flex-wrap gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => { setSelectedSubsection(subsection.id); handleAddScriptureSlide(); }} className="flex-1">
                                                  <Book className="w-3 h-3 mr-1" />
                                                  Add Scripture
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setSelectedSubsection(subsection.id); handleAddLyricsSlide(); }} className="flex-1">
                                                  <Music className="w-3 h-3 mr-1" />
                                                  Add Lyrics
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setSelectedSubsection(subsection.id); handleAddImageSlide(); }} className="flex-1">
                                                  <ImageIcon className="w-3 h-3 mr-1" />
                                                  Add Image
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setSelectedSubsection(subsection.id); handleAddVideoSlide(); }} className="flex-1">
                                                  <Film className="w-3 h-3 mr-1" />
                                                  Add Video
                                                </Button>
                                              </div>
                                            )}
                                          </Card>
                                        </SortableSubsection>
                                      ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                                <div className="mt-3 ml-8">
                                  <Button onClick={() => handleAddSubsection(section.id)} variant="ghost" size="sm" className="w-full text-muted-foreground">
                                    <FilePlus className="w-4 h-4" />
                                    Add a part
                                  </Button>
                                </div>
                                </>
                                )}
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
          </div>
        </div>

      {/* New Comprehensive Lyrics Editor */}
      {designing && (() => {
        const item = service?.sections?.find((s) => s.id === designing.sectionId)?.subsections.find((s) => s.id === designing.subsectionId);
        return (
          <DesignSlideDialog
            open
            slide={designing.slide}
            itemName={item?.name ?? 'this item'}
            itemSlides={item?.slides ?? [designing.slide]}
            onClose={() => setDesigning(null)}
            onApply={(changed) => {
              changed.forEach((s) => handleUpdateSlide(designing.sectionId, designing.subsectionId, s));
              toast.success('Design applied');
            }}
          />
        );
      })()}
      <AiSlidesDialog
        open={showAiSlides}
        onClose={() => setShowAiSlides(false)}
        onAdd={(slides) => {
          slides.forEach((slide) => addSlideToSubsection(slide));
          toast.success(`${slides.length} slide${slides.length === 1 ? '' : 's'} added`);
        }}
      />
      <LyricsEditor
        open={showLyricsEditor}
        onClose={() => {
          setShowLyricsEditor(false);
          setEditingLyricsContext(null);
        }}
        onSave={handleSaveLyricsFromEditor}
        initialSongTitle={editingLyricsContext ? editingLyricsContext.songTitle : ''}
        initialLyrics={editingLyricsContext ? (() => {
          // Gather all slides for this song and reconstruct the lyrics
          const section = service?.sections.find(s => s.id === editingLyricsContext.sectionId);
          const subsection = section?.subsections.find(sub => sub.id === editingLyricsContext.subsectionId);
          const songSlides = subsection?.slides.filter(s => 
            s.type === 'lyrics' && (s as LyricsSlide).songTitle === editingLyricsContext.songTitle
          ) as LyricsSlide[] || [];
          
          // Group slides by section and reconstruct lyrics
          const sections: string[] = [];
          let currentSection = '';
          let currentSectionType = '';
          
          songSlides
            .filter(s => s.content !== editingLyricsContext.songTitle) // Skip title card
            .forEach(slide => {
              const sectionLabel = slide.section ? 
                (slide.section.charAt(0).toUpperCase() + slide.section.slice(1)) : '';
              
              if (sectionLabel && sectionLabel !== currentSectionType) {
                if (currentSection) {
                  sections.push(currentSection);
                }
                currentSectionType = sectionLabel;
                currentSection = sectionLabel + '\n' + slide.content;
              } else {
                if (currentSection) {
                  currentSection += '\n' + slide.content;
                } else {
                  currentSection = slide.content;
                }
              }
            });
          
          if (currentSection) {
            sections.push(currentSection);
          }
          
          return sections.join('\n\n');
        })() : ''}
      />

      {/* Announcement Editor Dialog */}
      {editingSlide?.type === 'announcement' && !(editingSlide as any)._isConverting && (
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
                  value={editingSlide.imageUrl || 'none'} 
                  onValueChange={(value) => setEditingSlide({...editingSlide, imageUrl: value === 'none' ? undefined : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select image" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="none">No image</SelectItem>
                    {media.filter(m => m.type === 'image' && m.url).map(m => (
                      <SelectItem key={m.id} value={m.url!}>{m.name}</SelectItem>
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

      {/* Blank Slide Conversion Dialog */}
      {editingSlide?.type === 'blank' && (editingSlide as any)._isConverting && (
        <Dialog open={true} onOpenChange={() => setEditingSlide(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Convert Blank Slide</DialogTitle>
              <DialogDescription>Choose what type of content this slide should contain</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => setEditingSlide({
                  ...editingSlide,
                  type: 'scripture',
                  _isConverting: false,
                  _needsScriptureInput: true,
                } as any)}
              >
                <Book className="w-8 h-8" />
                <span>Scripture</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => setEditingSlide({
                  ...editingSlide,
                  type: 'lyrics',
                  _isConverting: false,
                  songTitle: '',
                  content: '',
                } as any)}
              >
                <Music className="w-8 h-8" />
                <span>Song Lyrics</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => setEditingSlide({
                  ...editingSlide,
                  type: 'announcement',
                  _isConverting: false,
                  content: '',
                } as any)}
              >
                <MessageSquare className="w-8 h-8" />
                <span>Announcement</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => setEditingSlide({
                  ...editingSlide,
                  type: 'image',
                  _isConverting: false,
                  _needsImageSelection: true,
                } as any)}
              >
                <ImageIcon className="w-8 h-8" />
                <span>Image</span>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSlide(null)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Existing Scripture Slide */}
      {editingSlide?.type === 'scripture' && !(editingSlide as any)._needsScriptureInput && editingSlide.id && (
        <Dialog open={true} onOpenChange={() => setEditingSlide(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Scripture Slide</DialogTitle>
              <DialogDescription>Change the verse for this scripture slide</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Current Verse:</p>
                <p className="text-lg font-semibold text-primary">
                  {(editingSlide as ScriptureSlide).verse.book} {(editingSlide as ScriptureSlide).verse.chapter}:{(editingSlide as ScriptureSlide).verse.verse}
                </p>
                <p className="text-sm mt-2 text-muted-foreground">
                  {(editingSlide as ScriptureSlide).verse.text}
                </p>
              </div>
              <div className="border-t pt-4">
                <Label className="text-base mb-3 block">Select New Verse:</Label>
                <ManualSearch 
                  onVerseSelect={async (verse) => {
                    const context = (editingSlide as any)._editContext;
                    if (context) {
                      const updatedSlide: ScriptureSlide = {
                        ...editingSlide as ScriptureSlide,
                        title: `${verse.book} ${verse.chapter}:${verse.verse}`,
                        verse,
                      };
                      handleUpdateSlide(context.sectionId, context.subsectionId, updatedSlide);
                      toast.success('Scripture updated');
                    }
                    setEditingSlide(null);
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSlide(null)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Scripture Input for Blank Slide Conversion */}
      {editingSlide?.type === 'scripture' && (editingSlide as any)._needsScriptureInput && (
        <Dialog open={true} onOpenChange={() => setEditingSlide(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Scripture Reference</DialogTitle>
              <DialogDescription>Enter the Bible verse reference</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <ManualSearch 
                onVerseSelect={async (verse) => {
                  const context = (editingSlide as any)._editContext;
                  if (context) {
                    const convertedSlide: ScriptureSlide = {
                      id: editingSlide.id!,
                      type: 'scripture',
                      title: `${verse.book} ${verse.chapter}:${verse.verse}`,
                      verse,
                    };
                    handleUpdateSlide(context.sectionId, context.subsectionId, convertedSlide);
                  }
                  setEditingSlide(null);
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSlide(null)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Existing Image Slide */}
      {editingSlide?.type === 'image' && !(editingSlide as any)._needsImageSelection && editingSlide.id && (
        <Dialog open={true} onOpenChange={() => setEditingSlide(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Image Slide</DialogTitle>
              <DialogDescription>Change the image or caption for this slide</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Current Image:</p>
                <div className="aspect-video relative rounded-lg overflow-hidden border">
                  <img 
                    src={(editingSlide as ImageSlide).imageUrl} 
                    alt="Current slide"
                    className="w-full h-full object-cover"
                  />
                </div>
                {(editingSlide as ImageSlide).caption && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    Caption: {(editingSlide as ImageSlide).caption}
                  </p>
                )}
              </div>
              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label>Select New Image</Label>
                  <Select 
                    value={(editingSlide as ImageSlide).imageUrl}
                    onValueChange={(value) => {
                      const selectedImage = media.find(m => m.url === value);
                      if (selectedImage) {
                        setEditingSlide({
                          ...editingSlide,
                          imageUrl: value,
                          title: selectedImage.name,
                        } as ImageSlide);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose an image" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-[200px]">
                      {media.filter(m => m.type === 'image' && m.url).map(m => (
                        <SelectItem key={m.id} value={m.url!}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Caption (Optional)</Label>
                  <Input
                    value={(editingSlide as ImageSlide).caption || ''}
                    onChange={(e) => setEditingSlide({
                      ...editingSlide,
                      caption: e.target.value
                    } as ImageSlide)}
                    placeholder="Add a caption for this image"
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSlide(null)}>Cancel</Button>
              <Button onClick={() => {
                const context = (editingSlide as any)._editContext;
                if (context && editingSlide.id) {
                  const updatedSlide: ImageSlide = {
                    ...editingSlide as ImageSlide,
                  };
                  handleUpdateSlide(context.sectionId, context.subsectionId, updatedSlide);
                  toast.success('Image slide updated');
                  setEditingSlide(null);
                }
              }}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Selection for Blank Slide Conversion */}
      {editingSlide?.type === 'image' && (editingSlide as any)._needsImageSelection && (
        <Dialog open={true} onOpenChange={() => setEditingSlide(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select Image</DialogTitle>
              <DialogDescription>Choose an image from your media library</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label>Select Image</Label>
              <Select 
                onValueChange={(value) => {
                  const context = (editingSlide as any)._editContext;
                  const selectedImage = media.find(m => m.url === value);
                  if (context && selectedImage) {
                    const convertedSlide: ImageSlide = {
                      id: editingSlide.id!,
                      type: 'image',
                      title: selectedImage.name,
                      imageUrl: value,
                    };
                    handleUpdateSlide(context.sectionId, context.subsectionId, convertedSlide);
                    setEditingSlide(null);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an image" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {media.filter(m => m.type === 'image' && m.url).map(m => (
                    <SelectItem key={m.id} value={m.url!}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {media.filter(m => m.type === 'image').length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No images available. Upload images in Media Library first.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSlide(null)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {notesDialog && (
        <NotesDialog
          target={notesDialog.type}
          value={notesContent}
          onChange={setNotesContent}
          onSave={saveNotes}
          onCancel={() => setNotesDialog(null)}
        />
      )}

      <ScriptureReferenceDialog
        open={showScriptureDialog}
        reference={scriptureReference}
        onReferenceChange={setScriptureReference}
        onSubmit={handleScriptureSubmit}
        onCancel={() => {
          setScriptureReference('');
          setShowScriptureDialog(false);
        }}
      />
    </AppShell>
  );
};

export default ServiceBuilder;