import { ethers } from 'ethers';
import { getNetworkConfig, ERC8004_TYPE } from './config.js';

const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [{ type: 'string', name: 'agentURI' }],
    name: 'register',
    outputs: [{ type: 'uint256', name: 'agentId' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { type: 'uint256', name: 'agentId' },
      { type: 'string', name: 'metadataKey' },
      { type: 'bytes', name: 'metadataValue' },
    ],
    name: 'setMetadata',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { type: 'uint256', name: 'agentId' },
      { type: 'string', name: 'metadataKey' },
    ],
    name: 'getMetadata',
    outputs: [{ type: 'bytes', name: '' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256', name: 'agentId' }],
    name: 'getAgentWallet',
    outputs: [{ type: 'address', name: '' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    name: 'tokenURI',
    outputs: [{ type: 'string', name: '' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    name: 'ownerOf',
    outputs: [{ type: 'address', name: '' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, type: 'address', name: 'from' },
      { indexed: true, type: 'address', name: 'to' },
      { indexed: true, type: 'uint256', name: 'tokenId' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, type: 'uint256', name: 'agentId' },
      { indexed: false, type: 'string', name: 'agentURI' },
      { indexed: true, type: 'address', name: 'owner' },
    ],
    name: 'Registered',
    type: 'event',
  },
];

export function getRegistryContract(signerOrProvider, network = 'mainnet') {
  const config = getNetworkConfig(network);
  return new ethers.Contract(config.identityRegistry, IDENTITY_REGISTRY_ABI, signerOrProvider);
}

// Build ERC-8004 compliant metadata
export function buildAgentMetadata({
  name,
  description,
  walletAddress,
  httpEndpoint,
  skills = [],
  x402Support = true,
  image,
  agentId,
  chainId,
}) {
  const services = [];

  if (httpEndpoint) {
    services.push({ name: 'web', endpoint: httpEndpoint });
  }

  // Each skill becomes a service entry
  for (const skill of skills) {
    services.push({
      name: skill.name || skill,
      endpoint: httpEndpoint ? `${httpEndpoint}/api/${skill.name || skill}` : `/api/${skill.name || skill}`,
      version: skill.price || 'free',
    });
  }

  const metadata = {
    type: ERC8004_TYPE,
    name,
    description,
    services,
    active: true,
    x402Support,
    supportedTrust: ['reputation'],
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (image) metadata.image = image;

  if (agentId && chainId) {
    const registry = chainId === 8453
      ? '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
      : '0x8004A818BFB912233c491871b3d84c89A494BD9e';
    metadata.registrations = [{
      agentId,
      agentRegistry: `eip155:${chainId}:${registry}`,
    }];
  }

  metadata.ext = {
    stack: 'clawr',
    version: '0.1.0',
    features: ['x402', ...skills.map(s => s.name || s)],
  };

  return metadata;
}

export function toDataURI(metadata) {
  const json = JSON.stringify(metadata);
  const encoded = Buffer.from(json).toString('base64');
  return `data:application/json;base64,${encoded}`;
}

export function parseDataURI(uri) {
  if (!uri.startsWith('data:')) return null;
  try {
    const match = uri.match(/^data:[^;]*;base64,(.+)$/);
    if (match) return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
    const jsonMatch = uri.match(/^data:[^,]*,(.+)$/);
    if (jsonMatch) return JSON.parse(decodeURIComponent(jsonMatch[1]));
  } catch { /* ignore */ }
  return null;
}

export async function registerAgent(signer, agentURI, network = 'mainnet') {
  const contract = getRegistryContract(signer, network);
  const config = getNetworkConfig(network);

  console.log(`Registering agent on ERC-8004 registry...`);
  console.log(`  Registry: ${config.identityRegistry}`);
  console.log(`  Network: ${network} (chain ${config.chainId})`);

  const tx = await contract.register(agentURI);
  console.log(`  TX submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`  Confirmed in block ${receipt.blockNumber}`);

  // Parse agentId from Registered event
  let agentId = '0';
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed?.name === 'Registered') {
        agentId = parsed.args?.agentId?.toString() || '0';
        break;
      }
    } catch { /* skip */ }
  }

  return { agentId, txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function setAgentMetadata(signer, agentId, key, value, network = 'mainnet') {
  const contract = getRegistryContract(signer, network);
  const metadataValue = ethers.toUtf8Bytes(value);
  const tx = await contract.setMetadata(agentId, key, metadataValue);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getAgentInfo(agentId, network = 'mainnet') {
  const config = getNetworkConfig(network);
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const contract = getRegistryContract(provider, network);

  const [owner, agentURI] = await Promise.all([
    contract.ownerOf(agentId).catch(() => null),
    contract.tokenURI(agentId).catch(() => null),
  ]);

  let metadata = null;
  if (agentURI) {
    metadata = parseDataURI(agentURI);
    if (!metadata && (agentURI.startsWith('http://') || agentURI.startsWith('https://'))) {
      try {
        const resp = await fetch(agentURI, { signal: AbortSignal.timeout(10000) });
        if (resp.ok) metadata = await resp.json();
      } catch { /* skip */ }
    }
  }

  return { agentId, owner, agentURI, metadata };
}

export { IDENTITY_REGISTRY_ABI };
