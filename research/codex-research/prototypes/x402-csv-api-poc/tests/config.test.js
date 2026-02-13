import test from "node:test";
import assert from "node:assert/strict";
import {
  assertFacilitatorAuthPolicy,
  assertFacilitatorPolicy,
  resolveFacilitatorUrl,
  resolveFacilitatorUrls,
  resolvePaymentNetwork,
  resolveRuntimeEnv,
} from "../src/config.js";

test("resolveRuntimeEnv normalizes test/prod aliases", () => {
  assert.equal(resolveRuntimeEnv("test"), "test");
  assert.equal(resolveRuntimeEnv("dev"), "test");
  assert.equal(resolveRuntimeEnv("production"), "prod");
  assert.equal(resolveRuntimeEnv("prod"), "prod");
});

test("resolveRuntimeEnv rejects invalid values", () => {
  assert.throws(() => resolveRuntimeEnv("staging"), /invalid runtime env/);
});

test("resolveFacilitatorUrl uses environment defaults", () => {
  assert.equal(
    resolveFacilitatorUrl({ runtimeEnv: "test" }),
    "https://x402.org/facilitator",
  );
  assert.equal(
    resolveFacilitatorUrl({ runtimeEnv: "prod" }),
    "https://api.cdp.coinbase.com/platform/v2/x402",
  );
});

test("resolveFacilitatorUrls supports explicit list and env list", () => {
  const previous = process.env.FACILITATOR_URLS;
  process.env.FACILITATOR_URLS = "http://a.local, http://b.local";

  try {
    assert.deepEqual(resolveFacilitatorUrls({ runtimeEnv: "test" }), [
      "http://a.local",
      "http://b.local",
    ]);
    assert.deepEqual(
      resolveFacilitatorUrls({
        runtimeEnv: "test",
        facilitatorUrls: ["http://primary.local", "http://fallback.local"],
      }),
      ["http://primary.local", "http://fallback.local"],
    );
  } finally {
    if (previous === undefined) delete process.env.FACILITATOR_URLS;
    else process.env.FACILITATOR_URLS = previous;
  }
});

test("resolvePaymentNetwork maps env to base network", () => {
  assert.equal(resolvePaymentNetwork("test"), "eip155:84532");
  assert.equal(resolvePaymentNetwork("prod"), "eip155:8453");
});

test("assertFacilitatorPolicy rejects prod with test facilitator", () => {
  assert.throws(
    () =>
      assertFacilitatorPolicy({
        runtimeEnv: "prod",
        facilitatorUrl: "https://x402.org/facilitator",
      }),
    /prod env cannot use test facilitator/,
  );
});

test("assertFacilitatorAuthPolicy requires key for prod CDP", () => {
  assert.throws(
    () =>
      assertFacilitatorAuthPolicy({
        runtimeEnv: "prod",
        facilitatorUrl: "https://api.cdp.coinbase.com/platform/v2/x402",
        facilitatorApiKey: "",
      }),
    /requires FACILITATOR_API_KEY/,
  );
});
