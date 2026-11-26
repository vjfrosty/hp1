export type HumorousRoleId =
  | 'grill_master'
  | 'chief_taster'
  | 'philosopher'
  | 'political_analyst'
  | 'meze_guardian'
  | 'designated_driver';

export type VenueType = 'механа' | 'кръчма' | 'двор' | 'вила' | 'домашна маса';

export type CompanySizePref = '2–3 души' | '4–6 души' | '7+ души';

export type RSVPStatus = 'confirmed' | 'maybe' | 'declined' | 'pending_approval';

export type MezeStatus = 'free' | 'claimed' | 'done';

export type SeasonalThemeId = 'classic' | 'trifon' | 'winter_turshiya' | 'summer_garden';

export type ActiveTab = 'feed' | 'radar' | 'create' | 'groups' | 'chronicle' | 'profile' | 'event';

export interface UserProfile {
  id: string;
  nickname: string;
  avatarInitials: string;
  avatarColor: string;
  city: string;
  neighborhood: string;
  usualAvailability: string;
  preferredVenues: VenueType[];
  favoriteMeze: string[];
  interests: string[];
  companySize: CompanySizePref;
  roleId: HumorousRoleId;
  nonAlcoholicPreferred: boolean;
  radarActive: boolean;
  radarRadiusKm: number;
  radarMessage: string;
  earnedBadges: string[];
  blockedUserIds: string[];
  createdAt: string;
}

export interface Attendee {
  userId: string;
  nickname: string;
  avatarInitials: string;
  avatarColor: string;
  roleId: HumorousRoleId;
  status: RSVPStatus;
  isOrganizer?: boolean;
  nonAlcoholic?: boolean;
  lateMinutes?: number;
  excuse?: string;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  isPinned?: boolean;
  sticker?: string;
  locationCard?: {
    venueName: string;
    neighborhood: string;
    city: string;
  };
  reactions: Record<string, string[]>; // emoji -> array of userIds
}

export interface PollOption {
  id: string;
  label: string;
  votes: string[]; // userIds
}

export interface MezePoll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  isOfficialCourt?: boolean;
}

export interface MezeContribution {
  id: string;
  item: string;
  category: 'салата' | 'мезе' | 'скара' | 'напитки' | 'логистика';
  status: MezeStatus;
  assignedToUserId?: string;
  assignedToName?: string;
}

export interface GatheringEvent {
  id: string;
  title: string;
  description: string;
  dateISO: string; // YYYY-MM-DD
  dateLabel: 'днес' | 'утре' | 'уикенда' | 'тази седмица';
  time: string; // HH:mm
  timeBucket: 'ранен вечер' | 'вечер' | 'късно';
  city: string;
  neighborhood: string;
  venueName: string;
  exactAddress: string; // Shown ONLY to approved / confirmed attendees
  venueType: VenueType;
  coords: [number, number]; // Approximate district coords (never exact home GPS)
  maxAttendees: number;
  isPrivate: boolean;
  manualApproval: boolean;
  friendsOnly: boolean;
  plannedFood: string;
  nonAlcoholicFriendly: boolean;
  seasonalTheme: SeasonalThemeId;
  coverImage: string;
  organizerId: string;
  organizerName: string;
  groupId?: string;
  isCancelled?: boolean;
  attendees: Attendee[];
  messages: ChatMessage[];
  polls: MezePoll[];
  contributions: MezeContribution[];
}

export interface QuorumSlot {
  id: string;
  label: string;
  dateLabel: string;
  time: string;
  voterIds: string[];
}

export interface GroupCouncil {
  id: string;
  name: string;
  motto: string;
  city: string;
  memberCount: number;
  memberNames: string[];
  regularSchedule: string;
  quorumRequired: number;
  quorumSlots: QuorumSlot[];
  meetingsHeld: number;
  isMember: boolean;
}

export interface ChronicleEntry {
  id: string;
  eventTitle: string;
  groupName: string;
  dateLabel: string;
  city: string;
  officialDecision: string;
  story: string;
  photoUrl?: string;
  authorName: string;
  visibility: 'friends' | 'group' | 'public';
  consentConfirmed: boolean;
  taggedParticipants: string[];
  likes: number;
  likedByMe?: boolean;
}

export interface TableWisdom {
  id: string;
  quote: string;
  authorNickname: string;
  context: string;
  consentGiven: boolean;
  sharedToGroup: boolean;
  dateLabel: string;
}

export interface AppNotification {
  id: string;
  type: 'invite' | 'approval' | 'change' | 'cancel' | 'quorum';
  title: string;
  body: string;
  eventId?: string;
  timestamp: string;
  read: boolean;
}

export interface ModerationReport {
  id: string;
  targetType: 'event' | 'user';
  targetId: string;
  targetName: string;
  reason: string;
  createdAt: string;
}
