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
import { Book, Music, Image as ImageIcon, Plus, Trash2, Save, Copy, ChevronDown, ChevronRight, FolderPlus, FilePlus, GripVertical, Upload, StickyNote, MessageSquare, FileQuestion, Pencil, MoreVertical, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { SlideConfiguration } from '@/components/SlideConfiguration';
import { CountdownConfiguration } from '@/components/CountdownConfig';
import { ManualSearch } from '@/components/ManualSearch';
import { PPTXImport } from '@/components/PPTXImport';
import { SongSelectImport } from '@/components/SongSelectImport';
import { LyricsEditor } from '@/components/LyricsEditor';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [songSelectMatches, setSongSelectMatches] = useState<Array<{ songTitle: string; index: number; lyrics: string }>>([]);
  const [showSongSelectDialog, setShowSongSelectDialog] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{ parsedSongs: ServiceSubsection[]; worshipSection: ServiceSection | null } | null>(null);
  const [showScriptureDialog, setShowScriptureDialog] = useState(false);
  const [scriptureReference, setScriptureReference] = useState('');
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
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

    // Create a slide for each verse
    verses.forEach(verse => {
      const newSlide: ScriptureSlide = {
        id: `slide-${Date.now()}-${verse.verse}`,
        type: 'scripture',
        title: `${verse.book} ${verse.chapter}:${verse.verse}`,
        verse,
      };
      addSlideToSubsection(newSlide);
    });
    
    toast.success(`Added ${verses.length} scripture slide${verses.length > 1 ? 's' : ''}`);
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
    
    // Create and trigger file input for image upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string;
          const newSlide: ImageSlide = {
            id: `slide-${Date.now()}-${i}`,
            type: 'image',
            title: file.name.replace(/\.[^/.]+$/, ''),
            imageUrl: imageUrl,
          };
          addSlideToSubsection(newSlide);
        };
        reader.readAsDataURL(file);
      }
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} added`);
    };
    input.click();
  };

  const handlePPTXImport = (slides: ImageSlide[]) => {
    if (!selectedSubsection) {
      toast.error('Please select a subsection first');
      return;
    }
    slides.forEach(slide => addSlideToSubsection(slide));
  };

  const handleDownloadTemplate = () => {
    const template = `Song Title,Lyrics
"Amazing Grace","Verse 1
Amazing grace how sweet the sound
That saved a wretch like me

Chorus
I once was lost but now I'm found
Was blind but now I see

Verse 2
Through many dangers toils and snares
I have already come"
"Example Song 2","Verse 1
First verse line 1
First verse line 2

Chorus
Chorus line 1
Chorus line 2"`;

    const blob = new Blob([template], { type: 'text/csv' });
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
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      
      // Skip header row
      const dataLines = lines.slice(1).filter(line => line.trim());
      
      if (dataLines.length === 0) {
        toast.error('No songs found in template');
        return;
      }

      // Find or create Worship section
      let worshipSection = service?.sections?.find(s => s.name.toLowerCase() === 'worship');
      
      if (!worshipSection) {
        worshipSection = {
          id: `section-${Date.now()}`,
          name: 'Worship',
          subsections: [],
        };
      }

      const parsedSongs: ServiceSubsection[] = [];
      const potentialMatches: Array<{ songTitle: string; index: number; lyrics: string }> = [];

      for (let index = 0; index < dataLines.length; index++) {
        const line = dataLines[index];
        // Simple CSV parsing (handles quoted fields)
        const match = line.match(/^"([^"]+)","([^"]*)"$/);
        if (!match) continue;

        const [, songTitle, lyrics] = match;
        
        // If lyrics are empty or minimal, collect as potential SongSelect match
        if (!lyrics || lyrics.trim().length < 50) {
          potentialMatches.push({ songTitle, index, lyrics });
          continue;
        }
        
        // Parse manual lyrics into slides (separated by blank lines)
        if (lyrics && lyrics.trim()) {
          const sections = lyrics.split(/\n\n+/).filter(s => s.trim());
          const slides: LyricsSlide[] = sections.map((section, slideIndex) => {
            const lines = section.trim().split('\n');
            const sectionName = lines[0].toLowerCase().includes('verse') ? 'verse' :
                               lines[0].toLowerCase().includes('chorus') ? 'chorus' :
                               lines[0].toLowerCase().includes('bridge') ? 'bridge' : undefined;
            const content = sectionName ? lines.slice(1).join('\n') : section;
            
            return {
              id: `slide-import-${Date.now()}-${index}-${slideIndex}`,
              type: 'lyrics',
              title: `${songTitle} - Slide ${slideIndex + 1}`,
              songTitle,
              slideNumber: slideIndex + 1,
              totalSlides: sections.length,
              content: content.trim(),
              section: sectionName,
            };
          });

          parsedSongs.push({
            id: `subsection-import-${Date.now()}-${index}`,
            name: songTitle,
            slides,
          });
        } else {
          toast.warning(`"${songTitle}" has no lyrics and was not found in SongSelect`);
        }
      }

      // If there are potential SongSelect matches, show confirmation dialog
      if (potentialMatches.length > 0) {
        setSongSelectMatches(potentialMatches);
        setPendingImportData({ parsedSongs, worshipSection });
        setShowSongSelectDialog(true);
        toast.info(`Found ${potentialMatches.length} song(s) that might be in SongSelect`);
        return;
      }

      // Update service with imported songs (when no SongSelect matches)
      setService(prev => {
        if (!prev) return null;
        
        const existingSection = prev.sections?.find(s => s.name.toLowerCase() === 'worship');
        
        if (existingSection) {
          // Add to existing Worship section
          return {
            ...prev,
            sections: prev.sections.map(s => 
              s.id === existingSection.id 
                ? { ...s, subsections: [...s.subsections, ...parsedSongs] }
                : s
            ),
          };
        } else {
          // Create new Worship section
          return {
            ...prev,
            sections: [
              ...(prev.sections || []),
              { ...worshipSection!, subsections: parsedSongs }
            ],
          };
        }
      });

      toast.success(`Imported ${parsedSongs.length} song(s) to Worship section`);
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleSongSelectImport = (songTitle: string, slides: LyricsSlide[]) => {
    // Find active section or Worship section
    let targetSection = service?.sections?.find(s => s.id === selectedSection);
    
    // If no active section or it's not appropriate, find/create Worship section
    if (!targetSection || !targetSection.name.toLowerCase().includes('worship')) {
      targetSection = service?.sections?.find(s => s.name.toLowerCase() === 'worship');
      
      if (!targetSection) {
        targetSection = {
          id: `section-${Date.now()}`,
          name: 'Worship',
          subsections: [],
        };
      }
    }

    const newSubsection: ServiceSubsection = {
      id: `subsection-${Date.now()}`,
      name: songTitle,
      slides,
    };

    setService(prev => {
      if (!prev) return null;
      
      const existingSection = prev.sections?.find(s => s.id === targetSection!.id);
      
      if (existingSection) {
        return {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === targetSection!.id
              ? { ...s, subsections: [...s.subsections, newSubsection] }
              : s
          ),
        };
      } else {
        return {
          ...prev,
          sections: [...(prev.sections || []), { ...targetSection!, subsections: [newSubsection] }],
        };
      }
    });

    toast.success(`Added "${songTitle}" as new subsection`);
  };

  const handleSongSelectConfirmation = async (useSongSelect: boolean) => {
    if (!pendingImportData) return;

    const { parsedSongs, worshipSection } = pendingImportData;

    if (useSongSelect) {
      // User wants to try importing from SongSelect
      toast.info(`Attempting to import ${songSelectMatches.length} song(s) from SongSelect...`);
      
      // TODO: Call SongSelect API for each match
      // For now, just show info message
      for (const match of songSelectMatches) {
        toast.info(`SongSelect API integration pending for "${match.songTitle}"`);
        // When implemented, this would call handleSongSelectImport with the fetched data
        // const songData = await fetchFromSongSelect(match.songTitle);
        // if (songData) handleSongSelectImport(match.songTitle, songData.slides);
      }
    } else {
      // User wants to skip SongSelect and add songs without lyrics
      for (const match of songSelectMatches) {
        if (match.lyrics && match.lyrics.trim()) {
          // If there are some lyrics, parse them
          const sections = match.lyrics.split(/\n\n+/).filter(s => s.trim());
          const slides: LyricsSlide[] = sections.map((section, slideIndex) => ({
            id: `slide-manual-${Date.now()}-${match.index}-${slideIndex}`,
            type: 'lyrics',
            title: `${match.songTitle} - Slide ${slideIndex + 1}`,
            songTitle: match.songTitle,
            slideNumber: slideIndex + 1,
            totalSlides: sections.length,
            content: section.trim(),
          }));
          
          parsedSongs.push({
            id: `subsection-manual-${Date.now()}-${match.index}`,
            name: match.songTitle,
            slides,
          });
        } else {
          toast.warning(`"${match.songTitle}" has no lyrics - skipped`);
        }
      }
    }

    // Update service with all parsed songs
    setService(prev => {
      if (!prev) return null;
      
      const existingSection = prev.sections?.find(s => s.name.toLowerCase() === 'worship');
      
      if (existingSection) {
        return {
          ...prev,
          sections: prev.sections.map(s => 
            s.id === existingSection.id 
              ? { ...s, subsections: [...s.subsections, ...parsedSongs] }
              : s
          ),
        };
      } else {
        return {
          ...prev,
          sections: [...(prev.sections || []), { ...worshipSection!, subsections: parsedSongs }],
        };
      }
    });

    toast.success(`Imported ${parsedSongs.length} song(s) to Worship section`);
    
    // Reset dialog state
    setShowSongSelectDialog(false);
    setSongSelectMatches([]);
    setPendingImportData(null);
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

              <div className="border-t pt-4">
                <Label className="mb-2 block">Worship Team Import</Label>
                <div className="space-y-2">
                  <Button onClick={handleDownloadTemplate} variant="outline" className="w-full justify-start" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Label htmlFor="worship-import" className="cursor-pointer">
                    <div className="flex items-center justify-start w-full px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent">
                      <Music className="w-4 h-4 mr-2" />
                      Import Worship Songs
                    </div>
                  </Label>
                  <Input
                    id="worship-import"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportWorshipSongs}
                  />
                </div>
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
                <Label className="mb-2 block">SongSelect Integration</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Import songs from CCLI SongSelect - creates new subsection in active or Worship section
                </p>
                <SongSelectImport 
                  onImportComplete={(songTitle, slides) => handleSongSelectImport(songTitle, slides)}
                />
              </div>

              <div className="border-t pt-4">
                <Label>Service Info</Label>
                <Input
                  value={service.name}
                  onChange={(e) => setService({...service, name: e.target.value})}
                  className="mt-2 mb-2"
                  placeholder="Service name"
                />
                <Input
                  type="date"
                  value={service.date instanceof Date ? service.date.toISOString().split('T')[0] : new Date(service.date).toISOString().split('T')[0]}
                  onChange={(e) => setService({...service, date: new Date(e.target.value)})}
                  className="mt-2 mb-2"
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Service Structure</h2>
              <Button onClick={handleAddSection} size="sm" className="gap-2">
                <FolderPlus className="w-4 h-4" />
                Add Section
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
                                    className="flex-1 font-semibold text-lg h-auto py-1 border-transparent hover:border-input focus:border-primary"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" onClick={() => openNotesDialog('section', section.id)} title="Operator Notes">
                                    <StickyNote className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDuplicateSection(section)} title="Duplicate Section">
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteSection(section.id)} title="Delete Section">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              <CollapsibleContent className="mt-4">
                                {section.subsections.length === 0 ? (
                                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground mb-3">No subsections yet</p>
                                    <Button onClick={() => handleAddSubsection(section.id)} variant="outline">
                                      <FilePlus className="w-4 h-4 mr-2" />
                                      Add Subsection
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
                                        <SortableSubsection key={subsection.id} subsection={subsection}>
                                          <Card className={`p-3 ${selectedSubsection === subsection.id ? 'border-primary bg-primary/5' : ''} ${activeId === subsection.id ? 'ring-2 ring-primary' : ''}`}>
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
                                                className="flex-1 font-medium h-auto py-1 border-transparent hover:border-input focus:border-primary"
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
                                              <div className="text-center py-6 border-2 border-dashed rounded-lg mt-2">
                                                <p className="text-xs text-muted-foreground mb-3">No slides yet. Add content:</p>
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                  <Button size="sm" variant="outline" onClick={() => { setSelectedSubsection(subsection.id); handleAddScriptureSlide(); }}>
                                                    <Book className="w-3 h-3 mr-1" />
                                                    Scripture
                                                  </Button>
                                                  <Button size="sm" variant="outline" onClick={() => { setSelectedSubsection(subsection.id); handleAddLyricsSlide(); }}>
                                                    <Music className="w-3 h-3 mr-1" />
                                                    Lyrics
                                                  </Button>
                                                  <Button size="sm" variant="outline" onClick={() => { setSelectedSubsection(subsection.id); handleAddImageSlide(); }}>
                                                    <ImageIcon className="w-3 h-3 mr-1" />
                                                    Image
                                                  </Button>
                                                  <Button size="sm" variant="outline" onClick={() => { setSelectedSubsection(subsection.id); handleAddAnnouncementSlide(); }}>
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
                                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-3">
                                                     {subsection.slides.map((slide) => (
                                                       <SortableSlide key={slide.id} slide={slide}>
                                                         <Card className={`group relative overflow-hidden hover-scale cursor-pointer ${activeId === slide.id ? 'ring-2 ring-primary' : ''}`}>
                                                            {/* Slide Preview with WYSIWYG */}
                                                            <div className="aspect-video bg-black relative overflow-hidden">
                                                              {(() => {
                                                                const fontSize = slide.textFormatting?.fontSize || 'large';
                                                                const alignment = slide.textFormatting?.alignment || 'center';
                                                                const fontSizeClasses = {
                                                                  small: 'text-[8px]',
                                                                  medium: 'text-[9px]',
                                                                  large: 'text-[10px]',
                                                                  xlarge: 'text-[11px]',
                                                                };
                                                                const alignmentClasses = {
                                                                  left: 'text-left items-start',
                                                                  center: 'text-center items-center',
                                                                  right: 'text-right items-end',
                                                                };
                                                                 const backgroundStyle = slide.backgroundMedia ? {
                                                                  backgroundImage: `url(${slide.backgroundMedia.url})`,
                                                                  backgroundSize: 'cover',
                                                                  backgroundPosition: 'center',
                                                                 } : subsection.backgroundMedia ? {
                                                                  backgroundImage: `url(${subsection.backgroundMedia.url})`,
                                                                  backgroundSize: 'cover',
                                                                  backgroundPosition: 'center',
                                                                 } : {};
                                                                const backgroundOpacity = slide.backgroundMedia?.opacity ?? subsection.backgroundMedia?.opacity ?? 0.3;

                                                                if (slide.type === 'image') {
                                                                  return (
                                                                    <>
                                                                      <img 
                                                                        src={(slide as ImageSlide).imageUrl} 
                                                                        alt={slide.title}
                                                                        className="w-full h-full object-cover"
                                                                      />
                                                                      {(slide as ImageSlide).caption && (
                                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white px-2 py-1">
                                                                          <p className="text-[8px] text-center line-clamp-1">{(slide as ImageSlide).caption}</p>
                                                                        </div>
                                                                      )}
                                                                    </>
                                                                  );
                                                                }

                                                                if (slide.type === 'scripture') {
                                                                  return (
                                                                    <div className="relative w-full h-full" style={backgroundStyle}>
                                                                      {(slide.backgroundMedia || subsection.backgroundMedia) && (
                                                                        <div className="absolute inset-0 bg-black" style={{ opacity: 1 - backgroundOpacity }} />
                                                                      )}
                                                                      <div className={`relative z-10 w-full h-full flex flex-col justify-center p-2 ${alignmentClasses[alignment]}`}>
                                                                        <div className={`text-[9px] font-bold text-primary mb-1 ${alignmentClasses[alignment].split(' ')[0]}`}>
                                                                          {(slide as ScriptureSlide).verse.book} {(slide as ScriptureSlide).verse.chapter}:{(slide as ScriptureSlide).verse.verse}
                                                                        </div>
                                                                        <div className={`${fontSizeClasses[fontSize]} leading-tight line-clamp-4 text-white ${alignmentClasses[alignment].split(' ')[0]}`}>
                                                                          {(slide as ScriptureSlide).verse.text}
                                                                        </div>
                                                                      </div>
                                                                    </div>
                                                                  );
                                                                }

                                                                if (slide.type === 'lyrics') {
                                                                  return (
                                                                    <div className="relative w-full h-full" style={backgroundStyle}>
                                                                      {(slide.backgroundMedia || subsection.backgroundMedia) && (
                                                                        <div className="absolute inset-0 bg-black" style={{ opacity: 1 - backgroundOpacity }} />
                                                                      )}
                                                                      <div className={`relative z-10 w-full h-full flex flex-col justify-center p-2 ${alignmentClasses[alignment]}`}>
                                                                        <div className={`text-[8px] font-semibold text-primary mb-0.5 ${alignmentClasses[alignment].split(' ')[0]}`}>
                                                                          {(slide as LyricsSlide).songTitle}
                                                                        </div>
                                                                        {(slide as LyricsSlide).section && (
                                                                          <div className={`text-[6px] text-muted-foreground mb-0.5 uppercase ${alignmentClasses[alignment].split(' ')[0]}`}>
                                                                            {(slide as LyricsSlide).section}
                                                                          </div>
                                                                        )}
                                                                        <div className={`${fontSizeClasses[fontSize]} leading-tight line-clamp-4 whitespace-pre-line text-white ${alignmentClasses[alignment].split(' ')[0]}`}>
                                                                          {(slide as LyricsSlide).content}
                                                                        </div>
                                                                      </div>
                                                                    </div>
                                                                  );
                                                                }

                                                                if (slide.type === 'announcement') {
                                                                  return (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-background text-foreground">
                                                                      {(slide as AnnouncementSlide).imageUrl && (
                                                                        <img
                                                                          src={(slide as AnnouncementSlide).imageUrl}
                                                                          alt={slide.title}
                                                                          className="max-h-12 mb-1 rounded"
                                                                        />
                                                                      )}
                                                                      <div className="text-[10px] font-bold text-primary mb-1 line-clamp-1">
                                                                        {(slide as AnnouncementSlide).title}
                                                                      </div>
                                                                      <div className="text-[8px] leading-tight text-center line-clamp-3 whitespace-pre-line">
                                                                        {(slide as AnnouncementSlide).content}
                                                                      </div>
                                                                    </div>
                                                                  );
                                                                }

                                                                if (slide.type === 'blank') {
                                                                  return (
                                                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                                                      <div className="text-[8px] font-medium text-muted-foreground">
                                                                        {slide.title || 'Blank Slide'}
                                                                      </div>
                                                                    </div>
                                                                  );
                                                                }

                                                                return null;
                                                              })()}
                                                             
                                                             {/* Drag Handle Overlay */}
                                                             <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                               <div className="bg-background/80 backdrop-blur-sm rounded p-1">
                                                                 <GripVertical className="w-3 h-3 text-muted-foreground" />
                                                               </div>
                                                             </div>
                                                           </div>
                                                           
                                                            {/* Slide Info & Actions */}
                                                            <div className="p-2 border-t">
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
                                                <Button size="sm" variant="outline" onClick={() => { setSelectedSubsection(subsection.id); handleAddScriptureSlide(); }} className="flex-1">
                                                  <Book className="w-3 h-3 mr-1" />
                                                  Add Scripture
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => { setSelectedSubsection(subsection.id); handleAddLyricsSlide(); }} className="flex-1">
                                                  <Music className="w-3 h-3 mr-1" />
                                                  Add Lyrics
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => { setSelectedSubsection(subsection.id); handleAddImageSlide(); }} className="flex-1">
                                                  <ImageIcon className="w-3 h-3 mr-1" />
                                                  Add Image
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
                                  <Button onClick={() => handleAddSubsection(section.id)} variant="outline" size="sm" className="w-full">
                                    <FilePlus className="w-4 h-4 mr-2" />
                                    Add Subsection
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
          </Card>
        </div>
      </div>

      {/* New Comprehensive Lyrics Editor */}
      <LyricsEditor
        open={showLyricsEditor}
        onClose={() => setShowLyricsEditor(false)}
        onSave={handleSaveLyricsFromEditor}
      />

      {/* Old Lyrics Editor Dialog - for editing existing slides */}
      {editingSlide?.type === 'lyrics' && (
        <Dialog open={true} onOpenChange={() => setEditingSlide(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Song Lyrics Slide</DialogTitle>
              <DialogDescription>Edit this individual lyrics slide</DialogDescription>
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
              <Button onClick={handleSaveLyricsSlide}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

      {/* Scripture Dialog */}
      <Dialog open={showScriptureDialog} onOpenChange={setShowScriptureDialog}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Scripture</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter a scripture reference. Examples: John 3:16, John 3:1-16, or John 3 (full chapter)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scripture-ref" className="text-sm font-medium text-foreground">
                Scripture Reference
              </Label>
              <Input
                id="scripture-ref"
                value={scriptureReference}
                onChange={(e) => setScriptureReference(e.target.value)}
                placeholder="e.g., John 3:16"
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScriptureSubmit();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setScriptureReference('');
                setShowScriptureDialog(false);
              }}
              className="border-border"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleScriptureSubmit}
              disabled={!scriptureReference.trim()}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SongSelect Confirmation Dialog */}
      {showSongSelectDialog && (
        <Dialog open={true} onOpenChange={() => setShowSongSelectDialog(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Import from SongSelect?</DialogTitle>
              <DialogDescription>
                {songSelectMatches.length} song(s) have minimal or no lyrics. Would you like to try importing them from CCLI SongSelect?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <p className="text-sm font-medium">Songs to check:</p>
              <ul className="text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                {songSelectMatches.map((match, idx) => (
                  <li key={idx}>• {match.songTitle}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4">
                Note: If SongSelect API is not configured, songs will be added without lyrics.
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleSongSelectConfirmation(false)}
              >
                Skip SongSelect
              </Button>
              <Button onClick={() => handleSongSelectConfirmation(true)}>
                Import from SongSelect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ServiceBuilder;