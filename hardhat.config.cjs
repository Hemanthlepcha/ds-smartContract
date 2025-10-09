require("dotenv/config");

require("@nomicfoundation/hardhat-toolbox");

require("@nomicfoundation/hardhat-ethers");

let RPC_URL = process.env.RPC_URL || "";

if (RPC_URL && !/^https?:\/\//i.test(RPC_URL)) {
  RPC_URL = `https://${RPC_URL}`;
}

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const CHAIN_ID = process.env.CHAIN_ID
  ? parseInt(process.env.CHAIN_ID, 10)
  : undefined;

/** @type import('hardhat/config').HardhatUserConfig */

const config = {
  solidity: {
    version: "0.8.24",

    settings: { optimizer: { enabled: true, runs: 5000 } },
  },

  networks: {
    hardhat: {},

    // Mainnet configuration

    mainnet: {
      url: process.env.RPC_URL,

      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],

      chainId: CHAIN_ID || 1, // Ethereum mainnet chain ID is 1

      gas: "auto",

      gasPrice: "auto",

      gasMultiplier: 1.2,
    },

    // Keep sepolia for testing

    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "", // Consider separate RPC URL for testnet

      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],

      chainId: 11155111,
    },

    custom: {
      url: RPC_URL,

      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],

      chainId: CHAIN_ID,
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",

    customChains: [
      {
        network: "mainnet",

        chainId: 1,

        urls: {
          apiURL: "https://api.etherscan.io/api",

          browserURL: "https://etherscan.io",
        },
      },

      {
        network: "sepolia",

        chainId: 11155111,

        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",

          browserURL: "https://sepolia.etherscan.io",
        },
      },
    ],
  },

  // Additional safety for mainnet

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",

    currency: "USD",

    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
  },
};

module.exports = config;
