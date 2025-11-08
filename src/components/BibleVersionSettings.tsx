import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BIBLE_VERSIONS, BibleVersionType } from '@/types/bibleVersion';
import { BibleParser } from '@/lib/bibleParser';
import { toast } from 'sonner';
import { Book, Upload, Key } from 'lucide-react';

interface BibleVersionSettingsProps {
  currentVersion: BibleVersionType;
  onVersionChange: (version: BibleVersionType) => void;
}

export const BibleVersionSettings = ({ currentVersion, onVersionChange }: BibleVersionSettingsProps) => {
  const [selectedVersion, setSelectedVersion] = useState<BibleVersionType>(currentVersion);
  const [esvApiKey, setEsvApiKey] = useState('');
  const [nltApiKey, setNltApiKey] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleVersionChange = (version: BibleVersionType) => {
    setSelectedVersion(version);
    onVersionChange(version);
    BibleParser.setVersion(version);
    
    const versionInfo = BIBLE_VERSIONS.find(v => v.id === version);
    toast.success('Bible version changed', {
      description: `Now using ${versionInfo?.fullName}`,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Invalid file type', {
        description: 'Please upload a JSON file',
      });
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Basic validation
      if (!Array.isArray(data) || !data[0]?.chapters) {
        throw new Error('Invalid Bible JSON format');
      }

      BibleParser.setCustomBible(data);
      handleVersionChange('custom');
      
      toast.success('Custom Bible uploaded', {
        description: 'Your custom translation is now active',
      });
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Invalid file format',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEsvApiKey = () => {
    if (esvApiKey.trim()) {
      BibleParser.setApiKey('esv', esvApiKey);
      toast.success('ESV API key saved');
    }
  };

  const handleSaveNltApiKey = () => {
    if (nltApiKey.trim()) {
      BibleParser.setApiKey('nlt', nltApiKey);
      toast.success('NLT API key saved');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Book className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">Bible Version</h4>
      </div>

      <div className="space-y-4">
        {/* Version Selector */}
        <div className="space-y-2">
          <Label htmlFor="bible-version">Translation</Label>
          <Select value={selectedVersion} onValueChange={(value: BibleVersionType) => handleVersionChange(value)}>
            <SelectTrigger id="bible-version">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BIBLE_VERSIONS.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{version.name} - {version.fullName}</span>
                    {version.isOffline && (
                      <span className="text-xs text-muted-foreground ml-2">Offline</span>
                    )}
                    {version.requiresApi && (
                      <span className="text-xs text-muted-foreground ml-2">Requires API</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select your preferred Bible translation
          </p>
        </div>

        {/* ESV API Key Section */}
        {selectedVersion === 'esv' && (
          <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-primary" />
              <Label htmlFor="esv-api-key">ESV API Key</Label>
            </div>
            <div className="flex gap-2">
              <Input
                id="esv-api-key"
                type="password"
                placeholder="Enter your ESV API key"
                value={esvApiKey}
                onChange={(e) => setEsvApiKey(e.target.value)}
              />
              <Button onClick={handleSaveEsvApiKey} size="sm">
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get a free API key from{' '}
              <a 
                href="https://api.esv.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                api.esv.org
              </a>
              {' '}(free for non-commercial/church use)
            </p>
          </div>
        )}

        {/* NLT API Key Section */}
        {selectedVersion === 'nlt' && (
          <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-primary" />
              <Label htmlFor="nlt-api-key">NLT API Key</Label>
            </div>
            <div className="flex gap-2">
              <Input
                id="nlt-api-key"
                type="password"
                placeholder="Enter your NLT API key"
                value={nltApiKey}
                onChange={(e) => setNltApiKey(e.target.value)}
              />
              <Button onClick={handleSaveNltApiKey} size="sm">
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get a free API key from{' '}
              <a 
                href="https://api.nlt.to" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                api.nlt.to
              </a>
              {' '}(free for non-commercial/church use)
            </p>
          </div>
        )}

        {/* Custom Upload Section */}
        {selectedVersion === 'custom' && (
          <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-4 h-4 text-primary" />
              <Label htmlFor="custom-bible">Upload Custom Bible</Label>
            </div>
            <Input
              id="custom-bible"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Upload a Bible JSON file in the same format as kjv-complete.json
            </p>
          </div>
        )}
      </div>
    </div>
  );
};