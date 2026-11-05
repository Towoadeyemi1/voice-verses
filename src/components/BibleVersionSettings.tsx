import { useState } from 'react';
import { BIBLE_VERSIONS, BibleVersionType } from '@/types/bibleVersion';
import { BibleParser } from '@/lib/bibleParser';
import { toast } from 'sonner';
import { ApiBibleSettings } from './ApiBibleSettings';
import { chosenApiBibles } from '@/lib/onlineBibles';
import { Upload } from 'lucide-react';
import { List, Row, Section } from './settings/kit';

interface BibleVersionSettingsProps {
  currentVersion: BibleVersionType;
  onVersionChange: (version: BibleVersionType) => void;
}

export const BibleVersionSettings = ({ currentVersion, onVersionChange }: BibleVersionSettingsProps) => {
  const [selectedVersion, setSelectedVersion] = useState<BibleVersionType>(currentVersion);
  const [esvApiKey, setEsvApiKey] = useState('');
  const [nltApiKey, setNltApiKey] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isTestingEsv, setIsTestingEsv] = useState(false);
  const [isTestingNlt, setIsTestingNlt] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [apiBibles, setApiBibles] = useState(chosenApiBibles);

  const handleVersionChange = (version: BibleVersionType) => {
    setSelectedVersion(version);
    onVersionChange(version);
    BibleParser.setVersion(version);
    
    const versionInfo = BIBLE_VERSIONS.find(v => v.id === version);
    const apiBible = apiBibles.find((b) => `api:${b.id}` === version);
    toast.success('Bible version changed', {
      description: `Now using ${versionInfo?.fullName ?? apiBible?.name ?? version}`,
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

  const handleTestEsvApiKey = async () => {
    if (!esvApiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }

    setIsTestingEsv(true);
    try {
      const response = await fetch(
        'https://api.esv.org/v3/passage/text/?q=John+3:16&include-headings=false&include-footnotes=false&include-verse-numbers=false&include-short-copyright=false&include-passage-references=false',
        {
          headers: {
            'Authorization': `Token ${esvApiKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.passages?.[0]) {
          toast.success('ESV API key is valid!', {
            description: 'Your key is working correctly',
          });
        } else {
          toast.error('Invalid response from ESV API');
        }
      } else {
        toast.error('Invalid ESV API key', {
          description: `Error: ${response.status} - ${response.statusText}`,
        });
      }
    } catch (error) {
      toast.error('Failed to test ESV API key', {
        description: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setIsTestingEsv(false);
    }
  };

  const handleTestNltApiKey = async () => {
    if (!nltApiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }

    setIsTestingNlt(true);
    try {
      const response = await fetch(
        `https://api.nlt.to/api/passages?ref=John+3:16&key=${nltApiKey}&version=NLT`
      );

      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 0) {
          toast.success('NLT API key is valid!', {
            description: 'Your key is working correctly',
          });
        } else {
          toast.error('Invalid response from NLT API');
        }
      } else {
        toast.error('Invalid NLT API key', {
          description: `Error: ${response.status} - ${response.statusText}`,
        });
      }
    } catch (error) {
      toast.error('Failed to test NLT API key', {
        description: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setIsTestingNlt(false);
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

  const handleExportVersion = async () => {
    if (BibleParser.isOnline(selectedVersion)) {
      toast.error('Cannot export API-based versions', {
        description: 'Only offline versions (KJV, ASV, WEB) can be exported',
      });
      return;
    }

    setIsExporting(true);
    try {
      const data = await BibleParser.exportCurrentVersion();
      if (!data) {
        toast.error('No data to export');
        return;
      }

      // Create downloadable JSON file
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedVersion}-bible-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Bible version exported!', {
        description: `${selectedVersion.toUpperCase()} downloaded successfully`,
      });
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const offline = BIBLE_VERSIONS.filter((v) => v.isOffline && v.id !== 'custom');
  const card = (id: BibleVersionType, name: string, detail: string) => (
    <button key={id} type="button" role="radio" aria-checked={selectedVersion === id} className="st-choice" onClick={() => handleVersionChange(id)} data-version={id}>
      <b>{name}</b>
      <span>{detail}</span>
    </button>
  );

  return (
    <>
      <Section title="On this computer" aside="Always works, no internet needed">
        <div className="st-choices" role="radiogroup" aria-label="Bible translation">
          {offline.map((v) => card(v.id, v.name, v.fullName))}
          {card('custom', 'Your own', 'A Bible file you add')}
        </div>
        {selectedVersion === 'custom' && (
          <List plain>
            <Row title="Add a Bible file" desc="A JSON file in the same format as the built-in Bibles.">
              <label className="st-btn">
                <Upload />
                {isUploading ? 'Adding…' : 'Choose file'}
                <input id="custom-bible" type="file" accept=".json" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
              </label>
            </Row>
          </List>
        )}
        {(selectedVersion === 'kjv' || selectedVersion === 'asv' || selectedVersion === 'web' || selectedVersion === 'custom') && (
          <button type="button" className="st-btn ghost self-start" onClick={handleExportVersion} disabled={isExporting}>
            <Upload />
            {isExporting ? 'Saving…' : `Save ${selectedVersion === 'custom' ? 'this Bible' : selectedVersion.toUpperCase()} as a file`}
          </button>
        )}
      </Section>

      <Section title="Over the internet" aside="Licensed translations, read when shown and never stored">
        <div className="st-choices" role="radiogroup" aria-label="Online Bible translation">
          {BIBLE_VERSIONS.filter((v) => v.requiresApi).map((v) => card(v.id, v.name, v.fullName.replace(' (Online)', '') + ' · needs a free key'))}
          {apiBibles.map((b) => card(`api:${b.id}` as BibleVersionType, b.abbreviation, `${b.name} · API.Bible`))}
        </div>
        {selectedVersion === 'esv' && (
          <List plain>
            <Row title="ESV key" desc={<>Free for church use from <a href="https://api.esv.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">api.esv.org</a>.</>}>
              <input id="esv-api-key" className="st-input w-56" type="password" placeholder="Paste the key" value={esvApiKey} onChange={(e) => setEsvApiKey(e.target.value)} aria-label="ESV key" />
              <button type="button" className="st-btn" onClick={handleTestEsvApiKey} disabled={isTestingEsv}>
                {isTestingEsv ? 'Testing…' : 'Test'}
              </button>
              <button type="button" className="st-btn primary" onClick={handleSaveEsvApiKey}>
                Save
              </button>
            </Row>
          </List>
        )}
        {selectedVersion === 'nlt' && (
          <List plain>
            <Row title="NLT key" desc={<>Free for church use from <a href="https://api.nlt.to" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">api.nlt.to</a>.</>}>
              <input id="nlt-api-key" className="st-input w-56" type="password" placeholder="Paste the key" value={nltApiKey} onChange={(e) => setNltApiKey(e.target.value)} aria-label="NLT key" />
              <button type="button" className="st-btn" onClick={handleTestNltApiKey} disabled={isTestingNlt}>
                {isTestingNlt ? 'Testing…' : 'Test'}
              </button>
              <button type="button" className="st-btn primary" onClick={handleSaveNltApiKey}>
                Save
              </button>
            </Row>
          </List>
        )}
        <ApiBibleSettings onChange={() => setApiBibles(chosenApiBibles())} />
      </Section>
    </>
  );
};
