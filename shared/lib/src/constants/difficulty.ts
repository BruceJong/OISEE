export const DIFFICULTY = {
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
} as const;
export type Difficulty = (typeof DIFFICULTY)[keyof typeof DIFFICULTY];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  L1: 'L1 · 启蒙',
  L2: 'L2 · 探索',
  L3: 'L3 · 深化',
};

export const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
};

export const AGE_BAND = {
  AGE_6_9: 'AGE_6_9',
  AGE_10_13: 'AGE_10_13',
  AGE_14_16: 'AGE_14_16',
} as const;
export type AgeBand = (typeof AGE_BAND)[keyof typeof AGE_BAND];

export const AGE_BAND_LABEL: Record<AgeBand, string> = {
  AGE_6_9: '6-9 岁',
  AGE_10_13: '10-13 岁',
  AGE_14_16: '14-16 岁',
};

export const AGE_BAND_TO_DIFFICULTY: Record<AgeBand, Difficulty> = {
  AGE_6_9: 'L1',
  AGE_10_13: 'L2',
  AGE_14_16: 'L3',
};
