export function parseNotepadPruneDaysOld(daysOld: unknown): { ok: true; days: number } | { ok: false; error: string } {
  if (daysOld === undefined) {
    return { ok: true, days: 7 };
  }

  if (typeof daysOld !== "number" || !Number.isFinite(daysOld)) {
    return { ok: false, error: "daysOld must be a finite number" };
  }

  const days = Math.trunc(daysOld);
  if (days < 0) {
    return { ok: false, error: "daysOld must be >= 0" };
  }

  return { ok: true, days };
}
