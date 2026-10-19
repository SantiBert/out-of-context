export type LocalRecordEntry = 'cover' | 'list';

export function localRecordEntry(unlocked: boolean): LocalRecordEntry {
  return unlocked ? 'list' : 'cover';
}
