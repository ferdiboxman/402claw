import { ethers } from 'ethers';
import { getNetworkConfig } from './config.js';

const REPUTATION_ABI = [
  {
    inputs: [
      { type: 'uint256', name: 'agentId' },
      { type: 'address[]', name: 'clientAddresses' },
      { type: 'bytes32', name: 'tag1' },
      { type: 'bytes32', name: 'tag2' },
    ],
    name: 'getSummary',
    outputs: [
      { type: 'uint256', name: 'count' },
      { type: 'int128', name: 'summaryValue' },
      { type: 'uint8', name: 'summaryValueDecimals' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { type: 'string', name: 'schemaId' },
      { type: 'uint256', name: 'agentId' },
      { type: 'int128', name: 'value' },
      { type: 'uint8', name: 'valueDecimals' },
      { type: 'bytes32', name: 'tag1' },
      { type: 'bytes32', name: 'tag2' },
      { type: 'string', name: 'ref' },
      { type: 'string', name: 'feedbackURI' },
      { type: 'bytes32', name: 'extraData' },
    ],
    name: 'giveFeedback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

function getReputationContract(signerOrProvider, network = 'mainnet') {
  const config = getNetworkConfig(network);
  return new ethers.Contract(config.reputationRegistry, REPUTATION_ABI, signerOrProvider);
}

export async function getAgentReputation(agentId, network = 'mainnet', trustedReviewers = []) {
  const config = getNetworkConfig(network);
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const contract = getReputationContract(provider, network);

  const [count, summaryValue, summaryValueDecimals] = await contract.getSummary(
    agentId,
    trustedReviewers,
    ethers.ZeroHash,
    ethers.ZeroHash,
  );

  if (count === 0n) {
    return { score: 0, count: 0 };
  }

  const score = Number(summaryValue) / Math.pow(10, Number(summaryValueDecimals));
  return { score, count: Number(count) };
}

export async function giveFeedback(signer, agentId, value, tag1, tag2, endpoint, network = 'mainnet') {
  const config = getNetworkConfig(network);
  const contract = getReputationContract(signer, network);

  const schemaId = `eip155:${config.chainId}:${config.identityRegistry}`;
  const tx = await contract.giveFeedback(
    schemaId,
    agentId,
    value,
    0,
    ethers.encodeBytes32String(tag1 || ''),
    ethers.encodeBytes32String(tag2 || ''),
    endpoint || '',
    '',
    ethers.ZeroHash,
  );

  const receipt = await tx.wait();
  return receipt.hash;
}

export { REPUTATION_ABI };
