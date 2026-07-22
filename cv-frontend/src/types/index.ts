// ─── Enums ────────────────────────────────────────────────────────────────────
export type Role = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
export type AttributeType = 'STRING' | 'TEXT' | 'IMAGE' | 'NUMERIC' | 'DATE' | 'PERIOD' | 'BOOLEAN' | 'ONE_OF_MANY';
export type AttributeCategory = 'CERTIFICATION' | 'DOMAIN_KNOWLEDGE' | 'PERSONAL_INFORMATION' | 'SOFT_SKILLS' | 'LANGUAGE' | 'EDUCATION' | 'OTHER';
export type PositionAccessType = 'PUBLIC' | 'RESTRICTED';
export type FilterOperator = 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'CONTAINS' | 'IN';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  role: Role;
  language: string;
  theme: string;
  isBlocked?: boolean;
  createdAt?: string;
  profile?: { firstName: string; lastName: string; photoUrl?: string };
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  location?: string;
  photoUrl?: string;
  version: number;
  attributeValues: AttributeValue[];
  projects: Project[];
}

export interface AttributeValue {
  id: string;
  profileId: string;
  attributeId: string;
  value: string | null;
  version: number;
  attribute: Attribute;
}

export interface Project {
  id: string;
  profileId: string;
  name: string;
  dateFrom: string;
  dateTo?: string;
  description: string;
  version: number;
  tags: { tag: Tag }[];
}

// ─── Attributes ───────────────────────────────────────────────────────────────
export interface Attribute {
  id: string;
  name: string;
  category: AttributeCategory;
  type: AttributeType;
  options?: string; // JSON array string for ONE_OF_MANY
  minLength?: number;
  maxLength?: number;
  regexPattern?: string;
  minValue?: number;
  maxValue?: number;
}

// ─── Positions ────────────────────────────────────────────────────────────────
export interface Position {
  id: string;
  title: string;
  shortDescription: string;
  accessType: PositionAccessType;
  maxProjects: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  attributes?: PositionAttribute[];
  accessRules?: AccessRule[];
  positionTags?: { tag: Tag }[];
  _count?: { cvs: number };
}

export interface PositionAttribute {
  id: string;
  positionId: string;
  attributeId: string;
  order: number;
  required: boolean;
  attribute: Attribute;
}

export interface AccessRule {
  id: string;
  positionId: string;
  attributeId: string;
  operator: FilterOperator;
  value: string;
  attribute?: Attribute;
}

// ─── CV ───────────────────────────────────────────────────────────────────────
export interface CV {
  id: string;
  userId: string;
  positionId: string;
  isHidden: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  position?: { title: string; shortDescription: string };
  user?: { profile?: { firstName: string; lastName: string; photoUrl?: string } };
  isLiked?: boolean;
  _count?: { likes: number };
}

export interface GeneratedCV {
  candidate: { firstName: string; lastName: string; location?: string; photoUrl?: string };
  positionTitle: string;
  attributes: AttributeValue[];
  projects: Project[];
}

// ─── Discussion ───────────────────────────────────────────────────────────────
export interface DiscussionPost {
  id: string;
  positionId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    role: Role;
    profile?: { firstName: string; lastName: string; photoUrl?: string };
  };
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
export interface Tag {
  id: string;
  name: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Stats {
  totalPositions: number;
  totalCVs: number;
  totalCandidates: number;
  totalRecruiters: number;
  newCVsToday: number;
}

export interface TagCloudItem {
  id: string;
  name: string;
  count: number;
}