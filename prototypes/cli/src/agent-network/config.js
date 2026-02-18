// Agent network configuration - Base mainnet defaults
export const NETWORK_CONFIG = {
  mainnet: {
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputationRegistry: '0xF19Be09644CACE04a6b04D7f79d02528a82B910B',
  },
  testnet: {
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0xF19Be09644CACE04a6b04D7f79d02528a82B910B',
  },
};

export function getNetworkConfig(network = 'mainnet') {
  return NETWORK_CONFIG[network] || NETWORK_CONFIG.mainnet;
}

export const ERC8004_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';

export const SCAN_API = 'https://api.8004scan.io/api/v1';
