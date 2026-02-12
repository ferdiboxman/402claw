import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createMockFacilitator } from "../src/facilitator.js";
import { createCsvApiServer } from "../src/api-server.js";
import { fetchWithX402 } from "../src/client.js";
import { PAYMENT_REQUIRED_HEADER, PAYMENT_SIGNATURE_HEADER } from "../src/payment.js";

async function setup() {
  const facilitator = createMockFacilitator();
  const fAddr = await facilitator.start(0);
  const facilitatorUrl = `http://${fAddr.host}:${fAddr.port}`;

  const api = createCsvApiServer({
    csvPath: path.resolve(process.cwd(), "fixtures", "airports.csv"),
    facilitatorUrl,
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
    assert.equal(challenge.accepts[0].network, "base-sepolia");
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
