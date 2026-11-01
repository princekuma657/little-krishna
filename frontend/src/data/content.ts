import type {
  Announcement, Category, CommunitySubmission, ContentCollection, ContentItem, Creator,
} from '../types';
import { api } from '../services/api';
import {
  PREVIEW_ANNOUNCEMENTS, PREVIEW_CATEGORIES, PREVIEW_COLLECTIONS,
  PREVIEW_CONTENT, PREVIEW_CREATORS, PREVIEW_SUBMISSIONS,
} from './preview';

export const SITE = {
  name: 'LittleKrishna',
  domain: 'littlekrishna.com',
  tagline: 'Indian Railway Simulation',
  heroTitle: 'BEYOND THE TRACKS.',
  heroEmphasis: 'INDIAN RAILWAY SIMULATION',
  heroSub: 'Discover the world of Indian railway simulation. Routes, locomotives, trains and community-built experiences for MSTS and Train Simulator Classic.',
  ctaPrimary: 'Explore The World',
  ctaSecondary: 'The Railway Story',
};

/**
 * These arrays are populated from the LittleKrishna API before routes render.
 * They are module-level so the existing page components can consume the same
 * typed collections while still being backed by the database, not bundled mocks.
 */
export const CATEGORIES: Category[] = [];
export const CONTENT: ContentItem[] = [];
export const COLLECTIONS: ContentCollection[] = [];
export const ANNOUNCEMENTS: Announcement[] = [];
export const CREATORS: Creator[] = [];
export const COMMUNITY_SUBMISSIONS: CommunitySubmission[] = [];
export const DOWNLOAD_HISTORY: never[] = [];

function replace<T>(target: T[], items: T[]) {
  target.length = 0;
  target.push(...items);
}

export async function loadPublicData(): Promise<void> {
  const [content, categories, collections, community] = await Promise.all([
    api.get<{ items: ContentItem[] }>('/content?pageSize=100'),
    api.get<{ items: Category[] }>('/categories'),
    api.get<{ items: ContentCollection[] }>('/collections'),
    api.get<{ creators: Creator[]; submissions: CommunitySubmission[]; announcements: Announcement[] }>('/community'),
  ]);
  replace(CONTENT, content.items);
  replace(CATEGORIES, categories.items);
  replace(COLLECTIONS, collections.items);
  replace(CREATORS, community.creators);
  replace(COMMUNITY_SUBMISSIONS, community.submissions);
  replace(ANNOUNCEMENTS, community.announcements);
}

export function resetPublicData() {
  CONTENT.length = 0;
  CATEGORIES.length = 0;
  COLLECTIONS.length = 0;
  CREATORS.length = 0;
  COMMUNITY_SUBMISSIONS.length = 0;
  ANNOUNCEMENTS.length = 0;
}

/**
 * Development-only design fallback. When the API cannot be reached while
 * running the dev server, the UI still renders using bundled preview data so
 * the front page can be reviewed without the backend. Production builds never
 * use this path — they always require the live LittleKrishna API.
 */
export function loadPreviewData(): void {
  replace(CATEGORIES, PREVIEW_CATEGORIES);
  replace(CONTENT, PREVIEW_CONTENT);
  replace(COLLECTIONS, PREVIEW_COLLECTIONS);
  replace(CREATORS, PREVIEW_CREATORS);
  replace(COMMUNITY_SUBMISSIONS, PREVIEW_SUBMISSIONS);
  replace(ANNOUNCEMENTS, PREVIEW_ANNOUNCEMENTS);
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const fmtMb = (mb: number | null) =>
  mb === null ? '—' : mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : mb >= 1 ? `${mb.toFixed(0)} MB` : `${Math.max(1, Math.round(mb * 1024))} KB`;

export const STATE_MESSAGES = {
  loading: 'Loading the LittleKrishna archive…',
  error: 'The archive could not be loaded. Check that the API is running and retry.',
  empty: 'Nothing has been published here yet.',
  unauthorized: 'You do not have permission to view this area.',
  notFound: 'This page or record does not exist.',
  offline: 'The API is unreachable. Check your connection and try again.',
  invalid: 'Data shown here is loaded from the LittleKrishna database.',
};
