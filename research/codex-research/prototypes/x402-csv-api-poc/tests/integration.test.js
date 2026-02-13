import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createMockFacilitator } from "../src/facilitator.js";
import { createCsvApiServer } from "../src/api-server.js";
import { fetchWithX402 } from "../src/client.js";
import { PAYMENT_REQUIRED_HEADER, PAYMENT_SIGNATURE_HEADER } from "../src/payment.js";

async function setup(apiOptions = {}) {
  const facilitator = createMockFacilitator();
  const fAddr = await facilitator.start(0);
  const facilitatorUrl = `http://${fAddr.host}:${fAddr.port}`;
  const resolvedFacilitatorUrls = Array.isArray(apiOptions.facilitatorUrls)
    ? apiOptions.facilitatorUrls.map((value) =>
        value === "__LOCAL_FACILITATOR__" ? facilitatorUrl : value,
      )
    : undefined;

  const api = createCsvApiServer({
    csvPath: path.resolve(process.cwd(), "fixtures", "airports.csv"),
    facilitatorUrl,
    ...apiOptions,
    facilitatorUrls: resolvedFacilitatorUrls,
  });
  const aAddr = await api.start(0);
  const apiUrl = `http://${aAddr.host}:${aAddr.port}`;

  return { api, facilitator, apiUrl, facilitatorUrl };
}

test("returns 402 with payment-required challenge when unpaid", async () => {
  const { api, facilitator, apiUrl } = await setup();

  try {
    const response = await fetch(`${apiUrl}/v1/records`);

    assert.equal(response.status, 402);

    const header = response.headers.get(PAYMENT_REQUIRED_HEADER);
    assert.ok(header);

    const challenge = JSON.parse(header);
    assert.equal(challenge.x402Version, 2);
    assert.equal(challenge.accepts[0].network, "eip155:84532");
  } finally {
    await api.stop();
    await facilitator.stop();
  }
});

test("client can auto-pay and receive settled response", async () => {
  const { api, facilitator, apiUrl } = await setup();

  try {
    const result = await fetchWithX402(`${apiUrl}/v1/records?limit=2&q=US`);
    const body = await result.response.json();

    assert.equal(result.response.status, 200);
    assert.equal(result.retried, true);
    assert.equal(body.ok, true);
    assert.equal(body.items.length, 2);
    assert.ok(result.receipt?.txHash);
  } finally {
    await api.stop();
    await facilitator.stop();
  }
});

test("falls back to secondary facilitator when primary is unreachable", async () => {
  const { api, facilitator, apiUrl, facilitatorUrl } = await setup({
    facilitatorUrls: ["http://127.0.0.1:1", "__LOCAL_FACILITATOR__"],
  });

  try {
    const result = await fetchWithX402(`${apiUrl}/v1/records?limit=1`);
    const body = await result.response.json();
    assert.equal(result.response.status, 200);
    assert.equal(body.ok, true);

    const settledEvent = api
      .telemetry()
      .find((event) => event.eventType === "payment_settled" && event.requestId === body.requestId);

    assert.ok(settledEvent);
    assert.equal(settledEvent.verifyFacilitatorUrl, facilitatorUrl);
    assert.equal(settledEvent.settleFacilitatorUrl, facilitatorUrl);
    assert.equal(settledEvent.verifyAttempts[0]?.facilitatorUrl, "http://127.0.0.1:1");
  } finally {
    await api.stop();
    await facilitator.stop();
  }
});

test("invalid payment gets rejected with 402", async () => {
  const { api, facilitator, apiUrl } = await setup();

  try {
    const invalidPayload = Buffer.from(JSON.stringify({
      paymentId: "0xdeadbeef",
      amount: "1000",
      payTo: "0x402c1aw000000000000000000000000000000000",
      resource: "/v1/records",
      signature: "bad_sig",
    }), "utf8").toString("base64url");

    const response = await fetch(`${apiUrl}/v1/records`, {
      headers: {
        [PAYMENT_SIGNATURE_HEADER]: invalidPayload,
      },
    });

    assert.equal(response.status, 402);
    const challenge = await response.json();
    assert.equal(challenge.error, "invalid_signature");
  } finally {
    await api.stop();
    await facilitator.stop();
  }
});

test("telemetry endpoint includes request ids and event history", async () => {
  const { api, facilitator, apiUrl } = await setup();

  try {
    const unpaid = await fetch(`${apiUrl}/v1/records`);
    assert.equal(unpaid.status, 402);

    const requestId = unpaid.headers.get("x-request-id");
    assert.ok(requestId);

    const telemetryResponse = await fetch(`${apiUrl}/v1/telemetry?limit=20`);
    assert.equal(telemetryResponse.status, 200);

    const telemetry = await telemetryResponse.json();
    assert.ok(Array.isArray(telemetry.events));
    assert.ok(
      telemetry.events.some(
        (event) => event.requestId === requestId && event.eventType === "payment_challenge_issued",
      ),
    );
  } finally {
    await api.stop();
    await facilitator.stop();
  }
});

test("throws when prod env uses x402.org test facilitator", async () => {
  assert.throws(
    () =>
      createCsvApiServer({
        csvPath: path.resolve(process.cwd(), "fixtures", "airports.csv"),
        runtimeEnv: "prod",
        facilitatorUrl: "https://x402.org/facilitator",
      }),
    /prod env cannot use test facilitator/,
  );
});

test("throws when prod env uses CDP facilitator without api key", async () => {
  assert.throws(
    () =>
      createCsvApiServer({
        csvPath: path.resolve(process.cwd(), "fixtures", "airports.csv"),
        runtimeEnv: "prod",
        facilitatorUrl: "https://api.cdp.coinbase.com/platform/v2/x402",
      }),
    /requires FACILITATOR_API_KEY/,
  );
});
