import { useState } from 'react';
import { BIBLE_VERSIONS, BibleVersionType } from '@/types/bibleVersion';
import { BibleParser, customBibleInfo } from '@/lib/bibleParser';
import { readBibleFile } from '@/lib/bibleFiles';
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
  /** The church's own Bible, if one was added: its name and short name */
  const [customInfo, setCustomInfo] = useState(customBibleInfo);
  const [isTestingEsv, setIsTestingEsv] = useState(false);
  const [isTestingNlt, setIsTestingNlt] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [apiBibles, setApiBibles] = useState(chosenApiBibles);

  const handleVersionChange = (version: BibleVersionType, quiet = false) => {
    setSelectedVersion(version);
    onVersionChange(version);
    BibleParser.setVersion(version);
    if (quiet) return;
    // The church's own Bible goes by its own name; until one is added, choosing it just shows where to add it
    if (version === 'custom') {
      const own = customBibleInfo();
      if (own) toast.success('Bible version changed', { description: `Now using ${own.name}` });
      return;
    }
    const versionInfo = BIBLE_VERSIONS.find(v => v.id === version);
    const apiBible = apiBibles.find((b) => `api:${b.id}` === version);
    toast.success('Bible version changed', {
      description: `Now using ${versionInfo?.fullName ?? apiBible?.name ?? version}`,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // OSIS, USFX, Zefania, USFM (or a .zip of them) and JSON, read on this computer (1.19.15)
      const bible = readBibleFile(file.name, new Uint8Array(await file.arrayBuffer()));
      await BibleParser.setCustomBible(bible.books, { name: bible.name, abbreviation: bible.abbreviation });
      setCustomInfo(customBibleInfo());
      handleVersionChange('custom', true);
      const left = bible.leftOut.length ? ` ${bible.leftOut.length} book${bible.leftOut.length === 1 ? '' : 's'} outside the 66 (such as the Apocrypha) were left out.` : '';
      const missing = bible.missing.length ? ` It doesn’t have ${bible.missing.length === 66 - 27 ? 'the Old Testament' : bible.missing.length === 27 ? 'the New Testament' : `${bible.missing.length} of the 66 books`}; verses from those come from the KJV.` : '';
      toast.success(`${bible.name} added`, {
        description: `${bible.verses.toLocaleString()} verses, shown as ${bible.abbreviation}.${missing}${left}`,
        duration: 9000,
      });
    } catch (error) {
      toast.error('This Bible file couldn’t be added', {
        description: error instanceof Error ? error.message : 'Voice Verses couldn’t read it.',
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
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
          {card('custom', customInfo?.abbreviation && customInfo.abbreviation !== 'Custom' ? customInfo.abbreviation : 'Your own', customInfo?.name && customInfo.name !== 'Your own Bible' ? customInfo.name : 'A Bible file you add')}
        </div>
        {selectedVersion === 'custom' && (
          <List plain>
            <Row
              title={customInfo ? 'Add a different Bible file' : 'Add a Bible file'}
              desc="OSIS, USFX, Zefania or USFM (a file, or a .zip from eBible.org), or JSON. Only add a Bible your church may use: public domain, or licensed to you."
            >
              <label className="st-btn">
                <Upload />
                {isUploading ? 'Adding…' : 'Choose file'}
                <input id="custom-bible" type="file" accept=".json,.xml,.osis,.usfx,.usfm,.sfm,.zip,.txt" onChange={handleFileUpload} disabled={isUploading} className="hidden" data-bible-file />
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
