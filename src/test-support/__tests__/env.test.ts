import test from "node:test";
import assert from "node:assert/strict";
import { withEnv } from "../env.js";

test("withEnv restores patched variables after success", async () => {
  const previous = process.env.WHITEY_TEST_ENV_RESTORE;
  try {
    process.env.WHITEY_TEST_ENV_RESTORE = "before";

    await withEnv({ WHITEY_TEST_ENV_RESTORE: "during" }, async () => {
      assert.equal(process.env.WHITEY_TEST_ENV_RESTORE, "during");
    });

    assert.equal(process.env.WHITEY_TEST_ENV_RESTORE, "before");
  } finally {
    if (previous === undefined) {
      delete process.env.WHITEY_TEST_ENV_RESTORE;
    } else {
      process.env.WHITEY_TEST_ENV_RESTORE = previous;
    }
  }
});

test("withEnv restores patched variables after failure", async () => {
  const previous = process.env.WHITEY_TEST_ENV_THROW;
  try {
    delete process.env.WHITEY_TEST_ENV_THROW;

    await assert.rejects(
      withEnv({ WHITEY_TEST_ENV_THROW: "during" }, async () => {
        assert.equal(process.env.WHITEY_TEST_ENV_THROW, "during");
        throw new Error("expected failure");
      }),
      /expected failure/
    );

    assert.equal(process.env.WHITEY_TEST_ENV_THROW, undefined);
  } finally {
    if (previous === undefined) {
      delete process.env.WHITEY_TEST_ENV_THROW;
    } else {
      process.env.WHITEY_TEST_ENV_THROW = previous;
    }
  }
});
