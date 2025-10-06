require('dotenv/config');
require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-ethers');
let RPC_URL = process.env.RPC_URL || '';
if (RPC_URL && !/^https?:\/\//i.test(RPC_URL)) {
  RPC_URL = `https://${RPC_URL}`;
}
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const CHAIN_ID = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID, 10) : undefined;

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 5000 } }
  },
  networks: {
    hardhat: {},
    custom: { url: RPC_URL, accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [], chainId: CHAIN_ID },
    sepolia: {
      url: RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: CHAIN_ID || 11155111
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
    customChains: [
      {
        network: 'sepolia',
        chainId: 11155111,
        urls: {
          apiURL: 'https://api-sepolia.etherscan.io/api',
          browserURL: 'https://sepolia.etherscan.io'
        }
      }
    ]
  }
};

module.exports = config;


