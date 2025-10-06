import { ethers } from 'ethers';
import { getEnv } from '../config/env.js';
import { createRequire } from 'node:module';
const requireJson = createRequire(import.meta.url);
const HashStore = requireJson('../abi/HashStore.json') as { abi: any };
const ABI = HashStore.abi;

export function getProvider(): ethers.JsonRpcProvider {
  const env = getEnv();
  return new ethers.JsonRpcProvider(env.RPC_URL, parseInt(env.CHAIN_ID, 10));
}

export function getWallet(): ethers.Wallet {
  const env = getEnv();
  return new ethers.Wallet(env.PRIVATE_KEY, getProvider());
}

export function getContract(): ethers.Contract {
  const env = getEnv();
  if (!env.CONTRACT_ADDRESS) throw new Error('contract_address_missing');
  return new ethers.Contract(env.CONTRACT_ADDRESS, ABI, getWallet());
}

export async function getOwnerAddress(): Promise<string> {
  const contract = getContract();
  return await contract.owner();
}

// Store hash with metadata commitment
export async function writeHash(hashHex: string, metadataRoot: string = ethers.ZeroHash): Promise<string> {
  const contract = getContract();
  const tx = await contract.store(hashHex, metadataRoot);
  const receipt = await tx.wait();
  const txHash: string = receipt?.hash || tx.hash;
  return txHash;
}

// Batch storage for multiple hashes with metadata commitments
export async function writeHashesBatch(hashes: string[], metadataRoots?: string[]): Promise<string> {
  const contract = getContract();
  
  // If metadataRoots not provided, create array of zero hashes
  const roots = metadataRoots || hashes.map(() => ethers.ZeroHash);
  
  const tx = await contract.storeBatch(hashes, roots);
  const receipt = await tx.wait();
  const txHash: string = receipt?.hash || tx.hash;
  return txHash;
}

export async function checkExists(hashHex: string): Promise<{
  // Core result
  exists: boolean;
  
  // If exists, get the full record details
  record?: {
    metadataRoot: string;
    timestamp: bigint;
    timestampDate: string;
  };
  
  // Network information
  network: {
    chainId: number;
    chainName: string;
    blockNumber: number;
    contractAddress: string;
    explorerUrl: string;
  };
  
  // Query metadata
  query: {
    hashQueried: string;
    queryTime: string;
    queryTimestamp: number;
  };
}> {
  const contract = getContract();
  const provider = getProvider();
  const env = getEnv();
  
  // Get current block and check existence in parallel
  const [exists, blockNumber] = await Promise.all([
    contract.exists(hashHex),
    provider.getBlockNumber()
  ]);
  
  // If hash exists, get the full record
  let record;
  if (exists) {
    const fullRecord = await contract.getRecord(hashHex);
    record = {
      metadataRoot: fullRecord.metadataRoot,
      timestamp: fullRecord.timestamp,
      timestampDate: new Date(Number(fullRecord.timestamp) * 1000).toISOString()
    };
  }
  
  const chainId = parseInt(env.CHAIN_ID, 10);
  const contractAddress = env.CONTRACT_ADDRESS!;
  const queryTime = new Date();
  
  // Determine chain name
  let chainName = 'Unknown';
  switch (chainId) {
    case 1: chainName = 'Ethereum Mainnet'; break;
    case 11155111: chainName = 'Sepolia Testnet'; break;
    case 137: chainName = 'Polygon Mainnet'; break;
    case 80001: chainName = 'Polygon Mumbai'; break;
  }
  
  // Generate explorer URL
  const explorerUrl = chainId === 11155111 
    ? `https://sepolia.etherscan.io/address/${contractAddress}`
    : `https://etherscan.io/address/${contractAddress}`;
  
  return {
    exists,
    record,
    network: {
      chainId,
      chainName,
      blockNumber,
      contractAddress,
      explorerUrl
    },
    query: {
      hashQueried: hashHex,
      queryTime: queryTime.toISOString(),
      queryTimestamp: queryTime.getTime()
    }
  };
}

// Get full record
export async function getRecord(hashHex: string): Promise<{ exists: boolean; metadataRoot: string; timestamp: bigint }> {
  const contract = getContract();
  return await contract.getRecord(hashHex);
}