import path from "node:path";
import { createMockFacilitator } from "./facilitator.js";
import { createCsvApiServer } from "./api-server.js";
import { fetchWithX402 } from "./client.js";

function withCwd(...segments) {
  return path.resolve(process.cwd(), ...segments);
}

async function startServers() {
  const facilitator = createMockFacilitator();
  const fAddr = await facilitator.start(0);
  const facilitatorUrl = `http://${fAddr.host}:${fAddr.port}`;

  const api = createCsvApiServer({
    csvPath: withCwd("fixtures", "airports.csv"),
    facilitatorUrl,
  });
  const aAddr = await api.start(0);
  const apiUrl = `http://${aAddr.host}:${aAddr.port}`;

  return { facilitator, api, facilitatorUrl, apiUrl };
}

async function runDemo() {
  const { facilitator, api, facilitatorUrl, apiUrl } = await startServers();

  try {
    console.log(`facilitator: ${facilitatorUrl}`);
    console.log(`api: ${apiUrl}`);

    const raw = await fetch(`${apiUrl}/v1/records?limit=2`);
    console.log(`initial status: ${raw.status}`);
    console.log(`payment-required header exists: ${Boolean(raw.headers.get("payment-required"))}`);

    const paid = await fetchWithX402(`${apiUrl}/v1/records?limit=2&q=international`);
    const body = await paid.response.json();

    console.log(`paid status: ${paid.response.status}`);
    console.log(`retried: ${paid.retried}`);
    console.log(`rows returned: ${body.items?.length ?? 0}`);
    console.log(`settled tx: ${paid.receipt?.txHash || "none"}`);
  } finally {
    await api.stop();
    await facilitator.stop();
  }
}

async function runCall(apiUrl) {
  const target = apiUrl || process.env.API_URL;
  if (!target) {
    throw new Error("usage: node src/cli.js call <api-url>");
  }

  const paid = await fetchWithX402(`${target}/v1/records?limit=3`);
  const body = await paid.response.json();

  console.log(JSON.stringify({
    status: paid.response.status,
    retried: paid.retried,
    total: body.total,
    items: body.items,
    receipt: paid.receipt,
  }, null, 2));
}

async function runStatus(apiUrl, facilitatorUrl) {
  const targetApi = apiUrl || process.env.API_URL;
  const targetFacilitator = facilitatorUrl || process.env.FACILITATOR_URL;

  if (!targetApi || !targetFacilitator) {
    throw new Error("usage: node src/cli.js status <api-url> <facilitator-url>");
  }

  const [apiResp, facResp] = await Promise.all([
    fetch(`${targetApi}/health`).then((r) => r.json()),
    fetch(`${targetFacilitator}/health`).then((r) => r.json()),
  ]);

  console.log(JSON.stringify({ api: apiResp, facilitator: facResp }, null, 2));
}

async function runStart() {
  const { facilitator, api, facilitatorUrl, apiUrl } = await startServers();
  console.log(`facilitator: ${facilitatorUrl}`);
  console.log(`api: ${apiUrl}`);
  console.log("press Ctrl+C to stop");

  const shutdown = async () => {
    await api.stop();
    await facilitator.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main() {
  const command = process.argv[2] || "demo";

  if (command === "demo") {
    await runDemo();
    return;
  }

  if (command === "start") {
    await runStart();
    return;
  }

  if (command === "call") {
    await runCall(process.argv[3]);
    return;
  }

  if (command === "status") {
    await runStatus(process.argv[3], process.argv[4]);
    return;
  }

  throw new Error(`unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
