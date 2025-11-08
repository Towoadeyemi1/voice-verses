import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Search, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { MediaItem, LyricsSlide } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';

interface SongSelectImportProps {
  onImportComplete?: (songTitle: string, slides: LyricsSlide[]) => void;
}

export const SongSelectImport = ({ onImportComplete }: SongSelectImportProps) => {
  const [ccliNumber, setCcliNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const parseLyricsToSlides = (lyrics: string, songTitle: string): LyricsSlide[] => {
    const sections = lyrics.split(/\n\s*\n/);
    const slides: LyricsSlide[] = [];
    
    sections.forEach((section, index) => {
      const trimmed = section.trim();
      if (!trimmed) return;
      
      // Detect section type
      let sectionType: 'verse' | 'chorus' | 'bridge' | 'outro' | undefined;
      const sectionLower = trimmed.toLowerCase();
      if (sectionLower.includes('verse')) sectionType = 'verse';
      else if (sectionLower.includes('chorus')) sectionType = 'chorus';
      else if (sectionLower.includes('bridge')) sectionType = 'bridge';
      else if (sectionLower.includes('outro')) sectionType = 'outro';
      
      slides.push({
        id: `${songTitle}-slide-${index}`,
        type: 'lyrics',
        title: songTitle,
        songTitle,
        slideNumber: slides.length + 1,
        totalSlides: 0, // Will be updated
        content: trimmed,
        section: sectionType,
      });
    });
    
    // Update total slides count
    slides.forEach(slide => {
      slide.totalSlides = slides.length;
    });
    
    return slides;
  };

  const handleImportByCCLI = async () => {
    if (!ccliNumber.trim()) {
      toast.error('Please enter a CCLI song number');
      return;
    }

    setIsSearching(true);
    
    try {
      // TODO: Call edge function with CCLI credentials
      // When implemented:
      // const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/songselect-import`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
      //   },
      //   body: JSON.stringify({ ccliNumber })
      // });
      // const data = await response.json();
      // const slides = parseLyricsToSlides(data.lyrics, data.title);
      // onImportComplete?.(data.title, slides);
      // setCcliNumber('');
      
      toast.info('SongSelect API Integration Required', {
        description: 'Contact your admin to configure SongSelect API credentials. Once setup, songs will be automatically imported as subsections.',
        duration: 5000,
      });
    } catch (error) {
      toast.error('Failed to import song');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    
    try {
      // TODO: Call edge function with SongSelect API
      // When implemented:
      // const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/songselect-search`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
      //   },
      //   body: JSON.stringify({ query: searchQuery })
      // });
      // const results = await response.json();
      // Show results in a dialog and let user select one
      // When selected, parse lyrics and call onImportComplete
      
      toast.info('SongSelect API Integration Required', {
        description: 'Contact your admin to configure SongSelect API credentials. Search will return songs that can be imported as subsections.',
        duration: 5000,
      });
    } catch (error) {
      toast.error('Failed to search');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Import from CCLI SongSelect</p>
      </div>

        {/* CCLI Number Import */}
        <div className="space-y-2">
          <Label>Import by CCLI Song Number</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter CCLI #"
              value={ccliNumber}
              onChange={(e) => setCcliNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImportByCCLI()}
            />
            <Button onClick={handleImportByCCLI} disabled={isSearching}>
              <Download className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label>Search SongSelect</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Search by title or artist"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">Setup Required:</p>
        <p>Contact admin to configure SongSelect API. Songs will be imported as subsections with slides in the active or Worship section.</p>
      </div>
    </div>
  );
};
