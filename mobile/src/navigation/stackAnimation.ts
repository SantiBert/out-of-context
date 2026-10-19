export type StackMotionAnimation = 'fade' | 'none';

export function stackScreenAnimation(
  reduceMotion: boolean,
): StackMotionAnimation {
  return reduceMotion ? 'none' : 'fade';
}
