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
  onImportComplete?: (item: MediaItem) => void;
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
      // Note: SongSelect API requires authentication
      // This is a placeholder - actual implementation would need backend edge function
      toast.info('SongSelect Integration', {
        description: 'Opening SongSelect to retrieve lyrics. Please copy the lyrics and paste them in the Media Library.',
        duration: 5000,
      });
      
      window.open(`https://songselect.ccli.com/songs/${ccliNumber}`, '_blank');
    } catch (error) {
      toast.error('Failed to open SongSelect');
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
      toast.info('SongSelect Integration', {
        description: 'Opening SongSelect search. Please copy the lyrics and paste them in the Media Library.',
        duration: 5000,
      });
      
      window.open(`https://songselect.ccli.com/search/results?SearchText=${encodeURIComponent(searchQuery)}`, '_blank');
    } catch (error) {
      toast.error('Failed to open SongSelect');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">SongSelect Import</h3>
            <p className="text-sm text-muted-foreground">Import songs using your CCLI SongSelect license</p>
          </div>
          <ExternalLink className="w-5 h-5 text-muted-foreground" />
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
          <p className="font-medium mb-1">Note:</p>
          <p>This will open SongSelect in a new tab. Copy the lyrics and paste them when adding a new song in the Media Library. A full API integration can be added with your CCLI credentials.</p>
        </div>
      </div>
    </Card>
  );
};
