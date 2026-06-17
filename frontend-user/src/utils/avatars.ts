/**
 * 预设头像（key → emoji + 底色）
 * 注册时从中选择，仅存一个 key；顶栏 / 个人中心据此渲染。
 */
export interface PresetAvatar {
  key: string;
  emoji: string;
  bg: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { key: 'fox',       emoji: '🦊', bg: '#D89531' },
  { key: 'panda',     emoji: '🐼', bg: '#305FBE' },
  { key: 'cat',       emoji: '🐱', bg: '#C95746' },
  { key: 'owl',       emoji: '🦉', bg: '#6B4D8C' },
  { key: 'dino',      emoji: '🦕', bg: '#4A8662' },
  { key: 'robot',     emoji: '🤖', bg: '#2B6F76' },
  { key: 'rocket',    emoji: '🚀', bg: '#B4452F' },
  { key: 'astronaut', emoji: '🧑‍🚀', bg: '#3A4A6B' },
];

const DEFAULT_AVATAR: PresetAvatar = { key: 'fox', emoji: '🎒', bg: '#D89531' };

/** 按 key 取头像，找不到回退默认（兼容历史/微信传入的未知 key） */
export function getAvatar(key?: string | null): PresetAvatar {
  if (!key) return DEFAULT_AVATAR;
  return PRESET_AVATARS.find((a) => a.key === key) ?? { ...DEFAULT_AVATAR, key };
}
