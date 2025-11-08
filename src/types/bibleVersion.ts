export type BibleVersionType = 'kjv' | 'asv' | 'web' | 'api' | 'custom';

export interface BibleVersionInfo {
  id: BibleVersionType;
  name: string;
  fullName: string;
  isOffline: boolean;
  requiresApi?: boolean;
  apiName?: string;
}

export const BIBLE_VERSIONS: BibleVersionInfo[] = [
  {
    id: 'kjv',
    name: 'KJV',
    fullName: 'King James Version',
    isOffline: true,
  },
  {
    id: 'asv',
    name: 'ASV',
    fullName: 'American Standard Version',
    isOffline: true,
  },
  {
    id: 'web',
    name: 'WEB',
    fullName: 'World English Bible',
    isOffline: true,
  },
  {
    id: 'api',
    name: 'API',
    fullName: 'Bible API (ESV, NIV, etc.)',
    isOffline: false,
    requiresApi: true,
  },
  {
    id: 'custom',
    name: 'Custom',
    fullName: 'Custom Upload',
    isOffline: true,
  },
];

export interface CustomBibleData {
  versionName: string;
  data: any;
}
