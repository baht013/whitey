type EnvPatch = Record<string, string | undefined>;

export async function withEnv<T>(patch: EnvPatch, fn: () => Promise<T>): Promise<T> {
  const previous: EnvPatch = {};

  for (const [key, value] of Object.entries(patch)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
