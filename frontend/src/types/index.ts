export type SimulatorType = 'MSTS' | 'RailWorks' | 'Train Simulator Classic';

export type AccessType = 'public' | 'registered' | 'supporter' | 'restricted';

export type ContentStatus = 'draft' | 'published' | 'archived';

export type DownloadStatus = 'authorized' | 'completed' | 'failed';

export interface ArtDirection {
  from: string;
  to: string;
  accent?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  categoryLabel: string;
  simulator: SimulatorType;
  packageType: string;
  author: string;
  art: ArtDirection;
  gallery: ArtDirection[];
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
  version: string;
  releaseDate: string;
  releaseNotes: string;
  installation: string;
  fileSizeMb: number | null;
  sha256: string | null;
  accessType: AccessType;
  featured: boolean;
  status: ContentStatus;
  downloads: number;
  featuredOrder?: number;
  hasDownload?: boolean;
  packageKind?: 'demo' | 'stored' | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentCollection {
  slug: string;
  title: string;
  description: string;
  itemSlugs: string[];
  art: ArtDirection;
}

export interface Category {
  slug: string;
  label: string;
  description: string;
}

export interface DownloadRecord {
  id: string;
  contentSlug: string;
  contentTitle: string;
  version: string;
  status: DownloadStatus;
  authorizedAt: string;
  completedAt: string | null;
  fileSizeMb: number | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  kind: 'release' | 'community' | 'supporter' | 'maintenance';
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  simulator: SimulatorType;
  focus: string;
  art: ArtDirection;
  projectTitle: string;
  likes: number;
}

export interface CommunitySubmission {
  id: string;
  title: string;
  author: string;
  simulator: SimulatorType;
  art: ArtDirection;
  likes: number;
  description?: string;
  mediaUrl?: string | null;
  moderationStatus?: string;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarColor: string;
  accountStatus: 'active' | 'suspended';
  roles: string[];
  createdAt: string;
  lastActiveAt: string;
  supporter?: {
    id: string;
    startsAt: string;
    expiresAt: string | null;
    status: string;
  } | null;
  entitlements?: string[];
  downloadCount?: number;
}

export interface AuthSession {
  user: UserProfile | null;
  status: 'authenticated' | 'anonymous' | 'loading';
  entitlements: string[];
}
