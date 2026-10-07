import test from "node:test";
import assert from "node:assert/strict";
import { pollForResult, RequestError } from "../src/activity.ts";

function clock() {
  let time = 0;
  const delays: number[] = [];
  return {
    now: () => time,
    wait: async (ms: number) => {
      delays.push(ms);
      time += ms;
    },
    delays,
  };
}

test("an interrupted status read reconnects to the same job and keeps confirmed progress", async () => {
  const timer = clock();
  const reads = [
    "funded",
    new TypeError("Failed to fetch"),
    new RequestError("LIVE_BACKEND_UNAVAILABLE", 503),
    "verifying",
    "settled",
  ];
  const confirmed: string[] = [];
  let retries = 0;
  const result = await pollForResult({
    read: async () => {
      const value = reads.shift()!;
      if (value instanceof Error) throw value;
      return value;
    },
    pending: (value) => value !== "settled",
    onValue: (value) => {
      confirmed.push(value);
    },
    onRetry: () => {
      retries++;
    },
    ...timer,
  });
  assert.equal(result, "settled");
  assert.deepEqual(confirmed, ["funded", "verifying", "settled"]);
  assert.equal(retries, 2);
  assert.deepEqual(timer.delays, [4000, 3000, 6000, 4000]);
});

test("a refused checkout is reported instead of retried", async () => {
  let reads = 0;
  await assert.rejects(
    pollForResult({
      read: async () => {
        reads++;
        throw new RequestError("PASS_NOT_FOUND", 404);
      },
      pending: () => true,
      onValue: () => assert.fail("No result was confirmed"),
      onRetry: () => assert.fail("Business errors must not loop"),
      ...clock(),
    }),
    /PASS_NOT_FOUND/,
  );
  assert.equal(reads, 1);
});

test("a rate limit backs off; a pending audit times out without claiming completion", async () => {
  const timer = clock();
  let reads = 0;
  const confirmed: string[] = [];
  await assert.rejects(
    pollForResult({
      read: async () => {
        if (++reads === 1) throw new RequestError("RATE_LIMITED", 429);
        return "running";
      },
      pending: () => true,
      onValue: (value) => {
        confirmed.push(value);
      },
      onRetry: () => {},
      timeout: 5000,
      ...timer,
    }),
    /CHECK_STILL_RUNNING/,
  );
  assert.deepEqual(confirmed, ["running"]);
  assert.deepEqual(timer.delays, [3000, 2000]);
});

test("a superseded watcher cannot render a late response from the old checkout", async () => {
  const controller = new AbortController();
  await assert.rejects(
    pollForResult({
      read: async () => {
        controller.abort();
        return "settled";
      },
      pending: () => false,
      onValue: () =>
        assert.fail("A stopped watcher must not overwrite the screen"),
      onRetry: () => assert.fail("A stopped watcher must not reconnect"),
      signal: controller.signal,
    }),
    { name: "AbortError" },
  );
});
