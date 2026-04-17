# Cornerstone Bible - Technical Documentation

## Overview

**Cornerstone Bible** is a voice-activated Scripture projection system designed for churches and worship environments. It uses real-time speech recognition powered by OpenAI's Realtime API to detect Bible verse references spoken by pastors/speakers and automatically displays them on a projection screen.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Core Features](#core-features)
4. [System Components](#system-components)
5. [Data Flow](#data-flow)
6. [Azure Functions Backend](#azure-functions-backend)
7. [Storage Architecture](#storage-architecture)
8. [Bible Data Structure](#bible-data-structure)
9. [Display System](#display-system)
10. [Service Builder](#service-builder)
11. [Configuration & Settings](#configuration--settings)
12. [Deployment](#deployment)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React/Vite)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Index     │  │  Projection  │  │   Service    │  │    Media     │ │
│  │   (Control)  │  │   Display    │  │   Builder    │  │   Library    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │                 │         │
│         └─────────────────┴────────┬────────┴─────────────────┘         │
│                                    │                                     │
│  ┌─────────────────────────────────▼─────────────────────────────────┐  │
│  │                    BroadcastChannel API                            │  │
│  │              (Cross-tab communication for slides)                  │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │                                     │
│  ┌────────────────┐  ┌─────────────▼─────────────┐  ┌────────────────┐  │
│  │   IndexedDB    │  │   Storage Orchestrator    │  │  File System   │  │
│  │  (Local Data)  │  │    (Data Sync Layer)      │  │   Access API   │  │
│  └────────────────┘  └───────────────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        AZURE FUNCTIONS BACKEND                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  realtime-token  │  │   blob-upload    │  │  blob-download   │       │
│  │  (OpenAI Auth)   │  │  (Azure Storage) │  │  (Azure Storage) │       │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘       │
│           │                     │                     │                  │
│  ┌────────▼─────────┐  ┌────────▼─────────────────────▼────────┐        │
│  │   OpenAI API     │  │         Azure Blob Storage            │        │
│  │  (Realtime WS)   │  │    (cornerstone-bible-data container) │        │
│  └──────────────────┘  └───────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | UI component library |
| **React Router** | Client-side routing |
| **React Query** | Server state management |
| **Framer Motion** | Animations |

### Backend (Azure Functions)
| Technology | Purpose |
|------------|---------|
| **Azure Functions** | Serverless compute |
| **Azure Blob Storage** | Cloud data persistence |
| **OpenAI Realtime API** | Speech-to-text & verse detection |
| **Node.js 18+** | Runtime |

### Storage
| Technology | Purpose |
|------------|---------|
| **IndexedDB** | Primary local storage |
| **File System Access API** | Local file backup |
| **Azure Blob Storage** | Cloud sync & backup |

---

## Core Features

### 1. Voice-Activated Scripture Detection
- Real-time audio transcription via multiple speech engines
- AI-powered Bible verse reference detection
- Automatic verse display when references are spoken
- Support for reading mode (auto-advance verses)
- Four speech modes: Local (offline service), Local AI (Ollama/LM Studio/Jan), Quick (browser built-in), Cloud (OpenAI)

### 2. Multi-Display Projection System
- Main projection display (full-screen for audience)
- Confidence monitor (speaker-facing display)
- Lower third overlays
- Cross-tab synchronization via BroadcastChannel API

### 3. Service Planning
- Drag-and-drop service builder
- Section and subsection organization
- Custom slide creation (scripture, lyrics, announcements)
- PowerPoint import support

### 4. Media Library
- Background images and videos
- Per-slide media assignment
- Opacity controls

### 5. Multiple Bible Versions
- KJV (King James Version)
- ASV (American Standard Version)
- WEB (World English Bible)
- Extensible for additional versions

---

## System Components

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| `Index.tsx` | `/` | Main control panel with voice recognition |
| `Projection.tsx` | `/projection` | Full-screen projection display |
| `Confidence.tsx` | `/confidence` | Speaker monitor display |
| `LowerThird.tsx` | `/lower-third` | Overlay display for streaming |
| `ServiceBuilder.tsx` | `/service-builder` | Service planning interface |
| `ServicePlanner.tsx` | `/service-planner` | Service scheduling |
| `MediaLibrary.tsx` | `/media-library` | Media asset management |
| `DisplayManager.tsx` | `/display-manager` | Multi-display configuration |
| `Presenter.tsx` | `/presenter` | Presentation control view |
| `Install.tsx` | `/install` | PWA installation guide |

### Key Components

#### Control Panel (`ControlPanel.tsx`)
The main interface for operators:
- **Audio Visualizer**: Shows microphone input levels
- **Transcript Window**: Displays real-time transcription
- **Verse Display**: Shows detected/selected verses
- **Manual Search**: Search for verses manually
- **Context Tracker**: Shows recent verses for quick re-display

#### Display Components
- **ProjectionDisplay.tsx**: Renders slides for projection
- **DisplayPreviewSlide.tsx**: Preview rendering with adaptive font sizing
- **SlideDisplay.tsx**: Individual slide rendering
- **VerseDisplay.tsx**: Scripture-specific display formatting
- **LowerThirdDisplay.tsx**: Overlay-style display

#### Service Builder Components
- **ServiceSection.tsx**: Service section management
- **ServiceSubsection.tsx**: Subsection organization
- **SlideCard.tsx**: Draggable slide cards
- **PlaylistController.tsx**: Playback controls

---

## Data Flow

### Voice Recognition Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Microphone  │────▶│  WebRTC     │────▶│  OpenAI     │────▶│  Verse      │
│   Input     │     │  Stream     │     │  Realtime   │     │  Detection  │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                                                                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Projection  │◀────│ Broadcast   │◀────│   Slide     │◀────│   Bible     │
│   Display   │     │  Channel    │     │  Creation   │     │   Lookup    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Voice Recognition Flow

All speech modes feed into the same central `VerseDetectionController`, which normalises transcripts, extracts references, de-duplicates, and emits verified verse events.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Speech Input (choose one)                     │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Local       │  Local AI    │  Quick       │  Cloud (OpenAI)    │
│  (WSProvider)│  (Ollama etc)│  (WebSpeech) │  (OpenAI Realtime) │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬─────────────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
               ┌──────────────────────────┐
               │  VerseDetectionController │
               │  - Normalise transcript   │
               │  - Extract reference      │
               │  - Dedupe / debounce      │
               └──────────────┬───────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │      Bible Lookup          │
              └───────────────┬───────────┘
                              │
                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Projection  │◀────│ Broadcast   │◀────│   Slide     │
│   Display   │     │  Channel    │     │  Creation   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Local AI Mode Detail

The `OllamaSpeechProvider` combines two steps:
1. **Audio capture** — Web Speech API provides a raw transcript
2. **LLM extraction** — transcript is sent to a local LLM with a focused prompt asking only for a verse reference (e.g. `"John 3:16"` or `"none"`)

Supports two server API formats:
- **Ollama native** (`POST /api/generate`) — for Ollama
- **OpenAI-compatible** (`POST /v1/chat/completions`) — for LM Studio, Jan, Llamafile, llama.cpp

### Step-by-Step Process (original OpenAI flow)

1. **Audio Capture**: Microphone captures speaker's voice
2. **WebRTC Stream**: Audio streamed via WebRTC to OpenAI
3. **Transcription**: OpenAI Realtime API transcribes speech
4. **Verse Detection**: AI identifies Bible verse references (e.g., "John 3:16")
5. **Bible Lookup**: System retrieves verse text from local JSON data
6. **Slide Creation**: Verse formatted into display slide
7. **Broadcast**: Slide sent to all display windows via BroadcastChannel
8. **Projection**: Displays render the verse with formatting

---

## Azure Functions Backend

### realtime-token

**Endpoint**: `POST /api/realtime-token`

Creates ephemeral authentication tokens for OpenAI Realtime API sessions.

```typescript
// Request
{ "language": "en" }

// Response
{
  "client_secret": {
    "value": "eph_xxx...",
    "expires_at": 1234567890
  }
}
```

**Key Features**:
- Configures OpenAI session for Bible verse detection
- Defines custom tools: `display_verse`, `suggest_verse_from_description`
- Sets up audio transcription parameters
- Includes detailed system instructions for verse recognition

### blob-upload

**Endpoint**: `POST /api/blob-upload`

Uploads data to Azure Blob Storage for cloud sync.

```typescript
// Request
{
  "filename": "services/service-123.json",
  "data": { /* service data */ }
}

// Response
{ "success": true, "filename": "...", "size": 1234 }
```

### blob-download

**Endpoint**: `GET /api/blob-download?filename=xxx`

Downloads data from Azure Blob Storage.

```typescript
// Response
{ /* stored JSON data */ }
```

### help-assistant

**Endpoint**: `POST /api/help-assistant`

AI-powered help system using OpenAI chat completions.

```typescript
// Request
{ "messages": [{ "role": "user", "content": "How do I..." }] }

// Response
{ "choices": [{ "message": { "content": "..." } }] }
```

---

## Storage Architecture

### Storage Orchestrator (`storageOrchestrator.ts`)

The central data management layer that coordinates between three storage backends:

```
┌─────────────────────────────────────────────────────────────┐
│                   Storage Orchestrator                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  IndexedDB   │  │ File System  │  │    Azure     │       │
│  │  (Primary)   │  │   (Backup)   │  │   (Cloud)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Unified AppState                        │    │
│  │  - Services (worship services)                       │    │
│  │  - Media items (backgrounds, images)                 │    │
│  │  - Settings (preferences, configurations)            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Priority Order for State Restoration
1. **IndexedDB** (fastest, always available)
2. **File System** (if access granted)
3. **Azure Blob Storage** (if configured and online)

### Auto-Sync Behavior
- Debounced Azure sync (prevents excessive API calls)
- Automatic sync when online
- Manual sync triggers available

---

## Bible Data Structure

### Data Files

Located in `src/data/`:
- `kjv-complete.json` - King James Version
- `asv-complete.json` - American Standard Version
- `web-complete.json` - World English Bible
- `bible.json` - Book metadata and abbreviations

### Verse Data Format

```typescript
interface BibleVerse {
  book: string;      // "Genesis", "John", etc.
  chapter: number;   // 1-based chapter number
  verse: number;     // 1-based verse number
  text: string;      // Verse content
}

interface BibleBook {
  name: string;
  abbrev: string[];  // ["Gen", "Ge", "Gn"]
  chapters: {
    [chapter: string]: {
      [verse: string]: string;
    }
  }
}
```

### Bible Parser (`bibleParser.ts`)

Handles:
- Verse reference parsing ("John 3:16", "Gen 1:1-3")
- Book name normalization
- Range expansion (e.g., "1-3" → verses 1, 2, 3)
- Multiple reference handling ("John 3:16; Rom 8:28")

---

## Display System

### Adaptive Font Sizing

The display system automatically calculates optimal font sizes based on text length:

```typescript
const getAdaptiveFontSize = (text: string, maxFontSize: number, minFontSize: number): number => {
  const charCount = text.length;
  
  if (charCount <= 40) return maxFontSize;           // 1-2 lines
  if (charCount <= 80) return maxFontSize * 0.85;    // 2-3 lines
  if (charCount <= 120) return maxFontSize * 0.70;   // 3-4 lines
  if (charCount <= 180) return maxFontSize * 0.55;   // 4-5 lines
  // ... continues scaling down
  
  return minFontSize;
};
```

### Display Dimensions
- **Target Resolution**: 1920x1080 (Full HD)
- **Content Area**: 1880x960 pixels
- **Padding**: 20px all sides

### Cross-Tab Communication

Uses the **BroadcastChannel API** for real-time slide synchronization:

```typescript
// Sender (Control Panel)
const channel = new BroadcastChannel('projection-slides');
channel.postMessage({
  type: 'SHOW_SLIDE',
  slide: { type: 'scripture', reference: 'John 3:16', text: '...' }
});

// Receiver (Projection Display)
channel.onmessage = (event) => {
  if (event.data.type === 'SHOW_SLIDE') {
    setCurrentSlide(event.data.slide);
  }
};
```

---

## Service Builder

### Service Structure

```typescript
interface Service {
  id: string;
  name: string;
  date: string;
  sections: ServiceSection[];
  settings: ServiceSettings;
}

interface ServiceSection {
  id: string;
  title: string;
  subsections: ServiceSubsection[];
  expanded: boolean;
}

interface ServiceSubsection {
  id: string;
  title: string;
  slides: Slide[];
  backgroundMedia?: MediaItem;
}

interface Slide {
  id: string;
  type: 'scripture' | 'lyrics' | 'announcement' | 'custom';
  content: string;
  reference?: string;  // For scripture
  backgroundMedia?: MediaItem;
}
```

### Drag and Drop

Uses **@dnd-kit** for drag-and-drop functionality:
- Reorder slides within subsections
- Move slides between subsections
- Reorder sections and subsections

---

## Configuration & Settings

### Settings Panel (`SettingsPanel.tsx`)

| Setting | Description |
|---------|-------------|
| **Bible Version** | Default translation (KJV/ASV/WEB) |
| **Transcription Language** | Voice recognition language |
| **Display Settings** | Font sizes, colors, backgrounds |
| **Storage Settings** | Azure sync configuration |
| **API Keys** | OpenAI key (dev mode only) |
| **Speech Mode** | Select recognition engine (see table below) |

### Speech Modes

| Mode | Component | Internet | Description |
|------|-----------|---------|-------------|
| **Local (Offline)** | `LocalSpeechWSProvider` | No | Connects to the local Cornerstone Speech Service (Sherpa-ONNX, Vosk, or Whisper) via WebSocket. Best for reliable offline use. |
| **Local AI** | `OllamaSpeechProvider` | No | Browser mic + local LLM (Ollama, LM Studio, Jan, Llamafile). Smart natural-language verse detection. Fully private. |
| **Quick** | `WebSpeechProvider` | Yes | Browser's built-in Web Speech API. Zero setup, but requires internet and Chrome/Edge/Safari. |
| **Cloud (OpenAI)** | `OpenAISpeechProvider` | Yes | OpenAI Realtime API via WebRTC. Highest accuracy, incurs API costs. |

### Scripture Background Settings

- Custom background images/videos per service
- Opacity controls
- Logo overlay options

### Local Storage Keys

```typescript
// Settings stored in localStorage
'openai-api-key'           // Development API key
'transcription-language'   // 'en', 'es', 'fr', etc.
'bible-version'           // 'kjv', 'asv', 'web'
'azure-function-url'      // Azure Functions endpoint
```

---

## Deployment

### Frontend Deployment

The frontend is deployed as a static site to **Azure Static Web Apps**:

```yaml
# .github/workflows/azure-static-web-apps-*.yml
- Build with Vite: npm run build
- Deploy dist/ folder to Azure
```

### Backend Deployment

Azure Functions deployed via GitHub Actions:

```yaml
# .github/workflows/main_cornerstone-bible.yml
- Build Azure Functions: npm run build
- Deploy to Azure Functions App
```

### Environment Variables

**Azure Functions**:
```
OPENAI_API_KEY=sk-xxx...
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
```

### PWA Support

The app includes Progressive Web App capabilities:
- Offline-capable via service worker
- Installable on desktop/mobile
- Caches Bible data for offline use

---

## API Reference

### OpenAI Realtime Session Configuration

```typescript
{
  model: 'gpt-4o-realtime-preview-2024-12-17',
  modalities: ['text'],
  input_audio_transcription: {
    model: 'whisper-1'
  },
  tools: [
    {
      type: 'function',
      name: 'display_verse',
      description: 'Display a Bible verse',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string' },
          chapter: { type: 'number' },
          startVerse: { type: 'number' },
          endVerse: { type: 'number' }
        }
      }
    },
    {
      type: 'function', 
      name: 'suggest_verse_from_description',
      description: 'Find verses matching a description',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string' }
        }
      }
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Voice recognition not starting | Missing API key | Add OpenAI API key in settings |
| Projection not updating | BroadcastChannel blocked | Use same origin for all windows |
| Verses not found | Incorrect reference format | Check book name spelling |
| Azure sync failing | Network/auth issues | Verify Azure connection string |

### Debug Mode

Access console logs via browser DevTools. Key events:
- `bible-api-fallback` - Manual verse entry
- `settings-updated` - Configuration changes
- `projection-slide` - Slide broadcasts

---

## Future Enhancements

1. **Additional Bible Versions** - ESV, NIV, NASB
2. **Multi-language Support** - Spanish, Portuguese Bibles
3. **Live Streaming Integration** - OBS/vMix overlays
4. **Mobile Companion App** - Remote control via phone
5. **Collaborative Editing** - Real-time multi-user service planning
6. **AI Sermon Notes** - Automatic note generation from transcripts

---

## License

This project is proprietary software for Cornerstone Church.

---

*Documentation Version: 1.0*  
*Last Updated: January 2025*
