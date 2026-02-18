import { SCAN_API } from './config.js';
import { createSignedFetch } from './auth.js';

// Search for agents by capability/skill using 8004scan API
export async function searchAgents(query, options = {}) {
  const { limit = 20, network = 'mainnet' } = options;
  const chainId = network === 'mainnet' ? 8453 : 84532;

  // Use 8004scan API for discovery
  const url = `${SCAN_API}/agents?chain_id=${chainId}&limit=${limit}&offset=0`;

  let agents = [];
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    const data = await resp.json();
    agents = data.items || [];
  } catch (err) {
    throw new Error(`Agent discovery failed: ${err.message}`);
  }

  // Client-side filter by query
  if (query) {
    const q = query.toLowerCase();
    agents = agents.filter(a => {
      const searchText = [
        a.name,
        a.description,
        ...(a.tags || []),
        ...(a.categories || []),
        ...(a.supported_protocols || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return searchText.includes(q);
    });
  }

  return agents.map(a => ({
    agentId: a.token_id,
    name: a.name || 'Unknown',
    description: a.description || '',
    owner: a.owner_address,
    wallet: a.agent_wallet || a.owner_address,
    capabilities: extractCapabilities(a),
    httpEndpoint: a.endpoints?.web?.endpoint || a.services?.web?.endpoint || null,
    x402Support: a.x402_supported || false,
    reputation: a.total_score || 0,
  }));
}

// Call another agent's skill with auto-pay via x402
export async function callAgentSkill(agentId, skill, payload = {}, options = {}) {
  const { wallet, network = 'mainnet' } = options;

  // First discover the agent's endpoint
  const agents = await searchAgents(null, { network, limit: 1000 });
  const agent = agents.find(a => String(a.agentId) === String(agentId));

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  if (!agent.httpEndpoint) {
    throw new Error(`Agent ${agentId} has no HTTP endpoint`);
  }

  const endpoint = `${agent.httpEndpoint}/api/${skill}`;
  const fetchFn = wallet ? createSignedFetch(wallet) : fetch;

  const resp = await fetchFn(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  // Handle x402 payment required
  if (resp.status === 402) {
    const paymentInfo = await resp.json().catch(() => null);
    return {
      status: 'payment-required',
      agentId,
      skill,
      endpoint,
      paymentInfo,
      message: `Agent ${agentId} requires payment for ${skill}. Use x402 to pay.`,
    };
  }

  if (!resp.ok) {
    throw new Error(`Agent call failed: ${resp.status} ${resp.statusText}`);
  }

  return {
    status: 'success',
    agentId,
    skill,
    result: await resp.json(),
  };
}

function extractCapabilities(agent) {
  const caps = [];
  if (agent.supported_protocols) caps.push(...agent.supported_protocols);
  if (agent.x402_supported) caps.push('x402');
  if (agent.services?.mcp) caps.push('mcp');
  if (agent.services?.a2a) caps.push('a2a');
  if (agent.tags) caps.push(...agent.tags);
  if (agent.categories) caps.push(...agent.categories);
  return [...new Set(caps.map(c => c.toLowerCase()))];
}

export function formatAgentList(agents) {
  if (agents.length === 0) return 'No agents found.';
  return agents.map(a =>
    `[${a.agentId}] ${a.name} (rep: ${a.reputation}) - ${a.capabilities.join(', ')}`
  ).join('\n');
}
