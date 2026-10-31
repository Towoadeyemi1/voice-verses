/** Built in, or `api:<id>` for a translation from API.Bible (NKJV, NIV, CSB…) */
export type BibleVersionType = 'kjv' | 'asv' | 'web' | 'esv' | 'nlt' | 'custom' | `api:${string}`;

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
    id: 'esv',
    name: 'ESV',
    fullName: 'English Standard Version (Online)',
    isOffline: false,
    requiresApi: true,
    apiName: 'ESV API (api.esv.org)',
  },
  {
    id: 'nlt',
    name: 'NLT',
    fullName: 'New Living Translation (Online)',
    isOffline: false,
    requiresApi: true,
    apiName: 'NLT API (api.nlt.to)',
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
