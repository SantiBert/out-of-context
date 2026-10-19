import type { LocalRng } from '../rules/round';

export function deviceRng(): LocalRng {
  return {
    sample(items, count) {
      const pool = [...items];
      const chosen: typeof pool = [];
      const take = Math.min(count, pool.length);
      for (let index = 0; index < take; index += 1) {
        const pick = Math.floor(Math.random() * pool.length);
        const item = pool.splice(pick, 1)[0];
        if (item !== undefined) {
          chosen.push(item);
        }
      }
      return chosen;
    },
    shuffle(items) {
      const pool = [...items];
      for (let index = pool.length - 1; index > 0; index -= 1) {
        const pick = Math.floor(Math.random() * (index + 1));
        const current = pool[index];
        const next = pool[pick];
        if (current !== undefined && next !== undefined) {
          pool[index] = next;
          pool[pick] = current;
        }
      }
      return pool;
    },
  };
}
