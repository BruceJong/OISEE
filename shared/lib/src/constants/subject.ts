export const SUBJECT = {
  PHYSICS: 'PHYSICS',
  CHEMISTRY: 'CHEMISTRY',
  BIOLOGY: 'BIOLOGY',
  GEOGRAPHY: 'GEOGRAPHY',
  OTHER: 'OTHER',
} as const;
export type Subject = (typeof SUBJECT)[keyof typeof SUBJECT];

export const SUBJECT_LABEL: Record<Subject, string> = {
  PHYSICS: '物理',
  CHEMISTRY: '化学',
  BIOLOGY: '生物',
  GEOGRAPHY: '地理',
  OTHER: '其他',
};

export const SUBJECT_COLOR: Record<Subject, string> = {
  PHYSICS: '#305FBE',
  CHEMISTRY: '#C95746',
  BIOLOGY: '#4A8662',
  GEOGRAPHY: '#6B4D8C',
  OTHER: '#6B7A98',
};

export const LEVEL_COLOR = {
  L1: '#4A8662',
  L2: '#D89531',
  L3: '#6B4D8C',
} as const;

export const CONTENT_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS];

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};
