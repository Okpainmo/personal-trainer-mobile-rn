import { client } from '@/shared/api/client';
import type { ApiEnvelope } from '@/shared/api/types';

import type {
  Trainer,
  TrainerAvailability,
  TrainerBenefit,
  TrainerGalleryImage,
} from '../types/trainer.types';

const FALLBACK_TRAINER_IMAGE =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800';
const FALLBACK_TRAINER_COVER =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200';
const FALLBACK_VIDEO =
  'https://videos.pexels.com/video-files/5528012/5528012-hd_1080_1920_25fps.mp4';
const STAGING_MEDIA_HOST = 'https://api.staging.fitcall.me';

// Placeholder client avatars rendered in the trainer-card stack until real
// client photos are surfaced through the API. Pool is curated Unsplash
// portraits with an ethnic mix biased toward African per the product
// brief, with white and Asian rounding it out.
//
// Unsplash IDs are stable and the same `images.unsplash.com/photo-<id>`
// pattern is used elsewhere in the codebase (FitnessPreferencesScreen,
// HomeScreen categories) and loads reliably. ClientAvatarStack has an
// onError fallback (CLIENT_AVATAR_FALLBACK below) so any URL that does
// fail on a particular device still renders a known-good portrait
// instead of an empty circle.
const CLIENT_AVATAR_QUERY = '?q=80&w=160&h=160&fit=crop&fm=jpg';
const CLIENT_AVATAR_POOL: string[] = [
  // African-leaning portraits (extra weight per brief):
  `https://images.unsplash.com/photo-1531123897727-8f129e1688ce${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1607746882042-944635dfe10e${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1546961342-1531eb2a2dec${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1503443207922-dff7d543fd0e${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1488161628813-04466f872be2${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1531746020798-e6953c6e8e04${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1492562080023-ab3db95bfbce${CLIENT_AVATAR_QUERY}`,
  // Asian-leaning portraits:
  `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2${CLIENT_AVATAR_QUERY}`,
  // White / European-leaning portraits:
  `https://images.unsplash.com/photo-1494790108377-be9c29b29330${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1500648767791-00dcc994a43e${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1517841905240-472988babdf9${CLIENT_AVATAR_QUERY}`,
  `https://images.unsplash.com/photo-1438761681033-6461ffad8d80${CLIENT_AVATAR_QUERY}`,
];

// Local fallback used by ClientAvatarStack when a remote URL fails to load.
// Exported so the stack component can import it without re-declaring the
// asset id.
export const CLIENT_AVATAR_FALLBACK: number = require('../../../../assets/coaches/CHRIS-2.png');

// Stable, dependency-free hash so each trainer id produces the same avatar
// subset on every render. Sum of char codes is enough variety for indexing
// a pool of this size.
function hashTrainerId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// Picks the avatars shown in the card stack and the "+N" count displayed
// next to it. The stack only renders up to 4 avatars (see
// ClientAvatarStack.maxVisible) so the avatar array is sized to that cap;
// `count` (4–7) drives the numeric label.
//
// Different ids → different starting offset → the four visible avatars
// land in a different order, so cards look visibly distinct even though
// the underlying pool is small.
function pickClientAvatars(id: string): { avatars: string[]; count: number } {
  const seed = hashTrainerId(id);
  const count = 4 + (seed % 4); // 4, 5, 6, or 7
  const poolSize = CLIENT_AVATAR_POOL.length;
  const offset = (seed >> 3) % poolSize;
  // Take the first 4 avatars (max ClientAvatarStack will show) starting at
  // the trainer-specific offset, so cards visibly differ.
  const VISIBLE = 4;
  const avatars = Array.from(
    { length: VISIBLE },
    (_, i) => CLIENT_AVATAR_POOL[(offset + i) % poolSize],
  );
  return { avatars, count };
}

type NullableRating =
  | number
  | string
  | null
  | undefined
  | {
      String?: string;
      Valid?: boolean;
    };

interface RawTrainerBenefit {
  id: string;
  title: string;
  subtext?: string | null;
  position?: number;
}

interface RawTrainer {
  id: string;
  user_id?: string;
  // Suspension/active flags — the backend may signal a suspended trainer via
  // any of these; all optional/defensive since the exact shape isn't fixed.
  status?: string | null;
  is_suspended?: boolean | null;
  suspended?: boolean | null;
  is_active?: boolean | null;
  name?: string | null;
  user?: {
    name?: string | null;
    full_name?: string | null;
    display_name?: string | null;
  } | null;
  specializations?: string[] | null;
  training_styles?: string[] | null;
  benefits?: RawTrainerBenefit[] | null;
  bio?: string | null;
  years_of_experience?: number | null;
  intro_video_url?: string | null;
  display_picture?: string | null;
  average_rating?: NullableRating;
  total_reviews?: number | null;
}

interface RawTrainerGalleryImage {
  id: string;
  image_url: string;
  position: number;
}

export interface TrainersPage {
  trainers: Trainer[];
  page: number;
  limit: number;
  hasNextPage: boolean;
}

interface TrainerPaginationMeta {
  page?: number;
  current_page?: number;
  currentPage?: number;
  limit?: number;
  per_page?: number;
  perPage?: number;
  total?: number;
  total_items?: number;
  totalItems?: number;
  total_pages?: number;
  totalPages?: number;
  has_next_page?: boolean;
  hasNextPage?: boolean;
}

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

// Backends vary: some use JS convention (Sun=0..Sat=6), some use ISO (Mon=1..Sun=7),
// some send day names ("monday"). Coerce everything to JS so getDay() comparisons line up.
function normalizeDayOfWeek(value: number | string): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 0 && value <= 6) return value;
    if (value === 7) return 0; // ISO Sunday → JS Sunday
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed in DAY_NAME_TO_INDEX) return DAY_NAME_TO_INDEX[trimmed];

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return normalizeDayOfWeek(parsed);
  }

  return null;
}

// Tolerates "HH:MM", "HH:MM:SS", "HH:MM:SSZ", "HH:MM:SS+00:00".
function normalizeTime(value: string): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  // Reject impossible clock values so unparseable availability records can't
  // produce time grids the user can never actually book.
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export async function fetchTrainersPage({
  category,
  page = 1,
  limit = 10,
}: {
  category?: string | null;
  page?: number;
  limit?: number;
} = {}): Promise<TrainersPage> {
  const response = await client.get<ApiEnvelope<RawTrainer[]>>('/trainers', {
    params: {
      page,
      limit,
      ...(category ? { category: category.toLowerCase() } : {}),
    },
  });
  const raw = response.data.data;
  // Suspended trainers must not appear in the list. Filter on the raw page, but
  // base pagination on the server's returned count (raw.length) so dropping a
  // few locally doesn't prematurely stop the "load more" heuristic.
  const trainers = raw.filter((t) => !isSuspendedTrainer(t)).map(mapTrainer);
  const meta = parsePaginationMeta(response.data.meta);

  return {
    trainers,
    page: meta.page ?? meta.current_page ?? meta.currentPage ?? page,
    limit: meta.limit ?? meta.per_page ?? meta.perPage ?? limit,
    hasNextPage: getHasNextPage(meta, raw.length, page, limit),
  };
}

const SUSPENDED_STATUSES = new Set(['suspended', 'inactive', 'banned', 'disabled', 'deactivated']);

// Defensive: a trainer is hidden if any status flag marks them suspended/inactive.
function isSuspendedTrainer(raw: RawTrainer): boolean {
  if (raw.is_suspended === true || raw.suspended === true || raw.is_active === false) return true;
  if (typeof raw.status === 'string' && SUSPENDED_STATUSES.has(raw.status.toLowerCase())) {
    return true;
  }
  return false;
}

export async function fetchTrainers(category?: string | null): Promise<Trainer[]> {
  const page = await fetchTrainersPage({ category, page: 1, limit: 50 });
  return page.trainers;
}

export async function fetchTrainerById(id: string): Promise<Trainer> {
  const response = await client.get<ApiEnvelope<RawTrainer>>(`/trainers/${id}`);

  return mapTrainer(response.data.data);
}

export async function fetchTrainerImages(id: string): Promise<TrainerGalleryImage[]> {
  const response = await client.get<ApiEnvelope<RawTrainerGalleryImage[]>>(
    `/trainers/${id}/images`,
  );

  return response.data.data
    .map((image) => ({
      id: image.id,
      imageUrl: normalizeMediaUrl(image.image_url, FALLBACK_TRAINER_IMAGE),
      position: image.position,
    }))
    .sort((a, b) => a.position - b.position)
    .slice(0, 5);
}

export async function fetchTrainerAvailability(id: string): Promise<TrainerAvailability[]> {
  const response = await client.get<ApiEnvelope<unknown>>(`/trainers/${id}/availability`);
  const raw = extractAvailabilityArray(response.data.data);

  const normalized = raw
    .map<TrainerAvailability | null>((slot) => {
      if (!slot || typeof slot !== 'object') return null;
      const rec = slot as Record<string, unknown>;
      const dayValue = rec.day_of_week ?? rec.dayOfWeek ?? rec.day;
      const startValue = rec.start_time ?? rec.startTime ?? rec.start;
      const endValue = rec.end_time ?? rec.endTime ?? rec.end;
      const tzValue = rec.timezone ?? rec.time_zone ?? '';

      const dayOfWeek = normalizeDayOfWeek(dayValue as number | string);
      const startTime = typeof startValue === 'string' ? normalizeTime(startValue) : null;
      const endTime = typeof endValue === 'string' ? normalizeTime(endValue) : null;
      if (dayOfWeek === null || !startTime || !endTime) return null;
      return { dayOfWeek, startTime, endTime, timezone: String(tzValue) };
    })
    .filter((slot): slot is TrainerAvailability => slot !== null);

  return normalized;
}

function extractAvailabilityArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>;
    for (const key of ['availability', 'items', 'slots', 'data', 'results']) {
      const value = rec[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

function parsePaginationMeta(meta: unknown): TrainerPaginationMeta {
  if (!meta) return {};

  if (typeof meta === 'string') {
    try {
      return parsePaginationMeta(JSON.parse(meta) as unknown);
    } catch {
      return {};
    }
  }

  if (typeof meta !== 'object') return {};
  return meta as TrainerPaginationMeta;
}

function getHasNextPage(
  meta: TrainerPaginationMeta,
  returnedCount: number,
  requestedPage: number,
  requestedLimit: number,
) {
  if (typeof meta.hasNextPage === 'boolean') return meta.hasNextPage;
  if (typeof meta.has_next_page === 'boolean') return meta.has_next_page;

  const currentPage = meta.page ?? meta.current_page ?? meta.currentPage ?? requestedPage;
  const limit = meta.limit ?? meta.per_page ?? meta.perPage ?? requestedLimit;
  const totalPages = meta.total_pages ?? meta.totalPages;
  if (typeof totalPages === 'number') return currentPage < totalPages;

  const total = meta.total ?? meta.total_items ?? meta.totalItems;
  if (typeof total === 'number') return currentPage * limit < total;

  return returnedCount >= requestedLimit;
}

function mapTrainer(raw: RawTrainer): Trainer {
  const { avatars: clientAvatars, count: clientCount } = pickClientAvatars(raw.id);
  const specializations = raw.specializations ?? [];
  const trainingStyles = raw.training_styles ?? [];
  const primarySpecialization = specializations[0] ?? trainingStyles[0] ?? 'fitness';
  const displayPicture = normalizeMediaUrl(raw.display_picture, FALLBACK_TRAINER_IMAGE);
  // `displayPicture` already falls back to the avatar image, so a `||` chain
  // there would never reach the cover fallback. Resolve cover separately
  // against the raw source so trainers without a display_picture get the
  // dedicated cover fallback instead of the avatar fallback.
  const coverImage = normalizeMediaUrl(raw.display_picture, FALLBACK_TRAINER_COVER);
  const name =
    raw.name ??
    raw.user?.name ??
    raw.user?.full_name ??
    raw.user?.display_name ??
    `${formatLabel(primarySpecialization)} Coach`;

  return {
    id: raw.id,
    name,
    specialty: `${formatLabel(primarySpecialization)} Coach`,
    image: displayPicture,
    coverImage,
    rating: parseRating(raw.average_rating),
    // Avatar set is hashed off the trainer id (different cards show
    // different clients). 'clients' is sized to match the avatar count so
    // the card's stack visual and the "+N" overflow read coherently.
    // Once real client photos are available through the API, drop the
    // CLIENT_AVATAR_POOL block and source 'clientAvatars' from raw.
    clientAvatars,
    clients: clientCount,
    experience: `${raw.years_of_experience ?? 0} yrs`,
    bio:
      raw.bio ??
      `Work with ${name} for coaching built around your goals, routine, and current fitness level.`,
    videoUrl: normalizeMediaUrl(raw.intro_video_url, FALLBACK_VIDEO),
    tags: specializations.map(formatLabel),
    trainingStyles: trainingStyles.map(formatLabel),
    benefits: mapBenefits(raw.benefits),
  };
}

function mapBenefits(benefits?: RawTrainerBenefit[] | null): TrainerBenefit[] {
  if (!benefits?.length) {
    return [
      {
        id: 'personalized-training',
        title: 'Personalized Training Plans',
        text: 'Custom coaching designed for your goals.',
      },
      {
        id: 'accountability',
        title: 'Real Accountability',
        text: 'Consistent support to help you stay on track.',
      },
    ];
  }

  return [...benefits]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((benefit) => ({
      id: benefit.id,
      title: benefit.title,
      text: benefit.subtext ?? '',
    }));
}

function normalizeMediaUrl(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (value.startsWith('http://localhost:9000')) {
    return value.replace('http://localhost:9000', STAGING_MEDIA_HOST);
  }

  if (value.startsWith('http://api.staging.fitcall.me')) {
    return value.replace('http://api.staging.fitcall.me', STAGING_MEDIA_HOST);
  }

  return value;
}

function parseRating(value: NullableRating) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && value.Valid !== false) {
    const parsed = Number(value.String);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
