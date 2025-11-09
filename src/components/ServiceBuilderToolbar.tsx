import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Book, Music, Image, MessageSquare, FolderPlus, Save, FileText } from 'lucide-react';

interface ServiceBuilderToolbarProps {
  onAddSection: () => void;
  onAddScripture: () => void;
  onAddLyrics: () => void;
  onAddImage: () => void;
  onAddAnnouncement: () => void;
  onSave: () => void;
  onSaveAsTemplate: () => void;
  hasSelection: boolean;
}

export const ServiceBuilderToolbar = ({
  onAddSection,
  onAddScripture,
  onAddLyrics,
  onAddImage,
  onAddAnnouncement,
  onSave,
  onSaveAsTemplate,
  hasSelection,
}: ServiceBuilderToolbarProps) => {
  return (
    <Card className="p-4 sticky top-0 z-20 bg-card/95 backdrop-blur border-border/50 shadow-elevated">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Add:</span>
          
          <Button
            onClick={onAddSection}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            Section
          </Button>

          <div className="w-px h-6 bg-border" />

          <Button
            onClick={onAddScripture}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!hasSelection}
            title={!hasSelection ? 'Select a section or subsection first' : 'Add scripture slide'}
          >
            <Book className="w-4 h-4" />
            Scripture
          </Button>

          <Button
            onClick={onAddLyrics}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!hasSelection}
            title={!hasSelection ? 'Select a section or subsection first' : 'Add lyrics'}
          >
            <Music className="w-4 h-4" />
            Lyrics
          </Button>

          <Button
            onClick={onAddImage}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!hasSelection}
            title={!hasSelection ? 'Select a section or subsection first' : 'Add image'}
          >
            <Image className="w-4 h-4" />
            Image
          </Button>

          <Button
            onClick={onAddAnnouncement}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!hasSelection}
            title={!hasSelection ? 'Select a section or subsection first' : 'Add announcement'}
          >
            <MessageSquare className="w-4 h-4" />
            Announcement
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onSaveAsTemplate}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Save as Template
          </Button>

          <Button
            onClick={onSave}
            size="sm"
            className="gap-2 gradient-divine"
          >
            <Save className="w-4 h-4" />
            Save Service
          </Button>
        </div>
      </div>
    </Card>
  );
};
