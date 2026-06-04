import styles from './Tags.module.css';

const LEVEL_COLOR: Record<string, string> = { L1: '#4A8662', L2: '#D89531', L3: '#6B4D8C' };
const SUBJECT_COLOR: Record<string, string> = {
  PHYSICS: '#305FBE', CHEMISTRY: '#C95746', BIOLOGY: '#4A8662', GEOGRAPHY: '#8C6B2A', OTHER: '#6B4D8C',
};
const DIFFICULTY_LABEL: Record<string, string> = { L1: 'L1 · 启蒙', L2: 'L2 · 探索', L3: 'L3 · 深化' };
const SUBJECT_LABEL: Record<string, string> = {
  PHYSICS: '物理', CHEMISTRY: '化学', BIOLOGY: '生物', GEOGRAPHY: '地理', OTHER: '其他',
};

export function LevelTag({ level }: { level: 'L1' | 'L2' | 'L3' }) {
  return (
    <span
      className={styles.tag}
      style={{
        color: LEVEL_COLOR[level],
        borderColor: LEVEL_COLOR[level] + '66',
        background: LEVEL_COLOR[level] + '0F',
      }}
    >
      {DIFFICULTY_LABEL[level]}
    </span>
  );
}

export function SubjectTag({ subject }: { subject: string }) {
  const color = (SUBJECT_COLOR as any)[subject] ?? '#6B7A98';
  const label = (SUBJECT_LABEL as any)[subject] ?? subject;
  return (
    <span
      className={styles.tag}
      style={{
        color,
        borderColor: color + '66',
        background: color + '0F',
      }}
    >
      {label}
    </span>
  );
}

export function PlainTag({ children }: { children: React.ReactNode }) {
  return <span className={styles.tag}>{children}</span>;
}
