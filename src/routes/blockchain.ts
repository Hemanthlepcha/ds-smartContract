import { ethers } from 'ethers';
import { Router } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../auth/jwt.js';
import {
    checkExists,
    getOwnerAddress,
    getRecord,
    getWallet,
    writeHash,
    writeHashesBatch
} from '../blockchain/client.js';
import { getEnv } from '../config/env.js';
import { deepDiff } from '../utils/deepDiff.js';
import { txExplorerUrl } from '../utils/explorer.js';

const router = Router();

// Debug endpoint to check blockchain connection
router.get('/health', async (_req, res) => {
  try {
    const env = getEnv();
    const owner = await getOwnerAddress();
    const wallet = await getWallet();
    const address = await wallet.getAddress();
    
    return res.json({
      status: 'ok',
      contract_address: env.CONTRACT_ADDRESS,
      chain_id: env.CHAIN_ID,
      owner_address: owner,
      wallet_address: address,
      rpc_url: env.RPC_URL.substring(0, 50) + '...' // Truncate for security
    });
  } catch (e: any) {
    return res.status(500).json({
      status: 'error',
      message: e.message,
      code: e.code
    });
  }
});

// Write endpoint: client provides hash and metadata
const writeSchema = z.object({
  hash: z.string().optional(), // Hash computed by client
  metadata: z.record(z.string(), z.any()).optional(), // Metadata to compute cryptographic commitment
  
  // Batch operations
  hashes: z.array(z.string()).optional(),
  metadatas: z.array(z.record(z.string(), z.any())).optional()
});

router.post('/write', authenticateJwt, async (req, res) => {
  const parsed = writeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  const { hash, metadata, hashes, metadatas } = parsed.data;

  // Manual validation for operations
  const isSingle = !!hash;
  const isBatch = Array.isArray(hashes) && hashes.length > 0;

  // For batch operations, if metadatas is provided, it must match hashes length
  if (isBatch && metadatas && metadatas.length !== hashes!.length) {
    return res.status(400).json({
      error: 'invalid_operation',
      message: 'If metadatas array is provided, it must match the length of hashes array'
    });
  }

  if (!isSingle && !isBatch) {
    return res.status(400).json({
      error: 'invalid_operation',
      message: 'Provide either single hash or array of hashes'
    });
  }

  try {
    // ownership check: only contract owner can write
    const [owner, signer] = await Promise.all([
      getOwnerAddress(),
      (async () => (await getWallet()).getAddress())()
    ]);
    if (owner.toLowerCase() !== signer.toLowerCase()) {
      return res.status(403).json({ error: 'not_owner', owner, signer });
    }

    // Handle single operation
    if (isSingle) {
      // If metadata is provided, compute commitment, else use zero hash
      const metadataRoot = metadata ? computeMetadataRoot(metadata) : ethers.ZeroHash;

      // Store hash and cryptographic commitment
      const txHash = await writeHash(hash, metadataRoot);
      const env = getEnv();
      const explorerUrl = txExplorerUrl(txHash, parseInt(env.CHAIN_ID, 10), env.RPC_URL);
      return res.json({ txHash, explorerUrl });
    }

    // Handle batch operation
    if (isBatch) {
      // Compute cryptographic commitments for all metadatas, use zero hash if not provided
      const metadataRoots = metadatas ? metadatas.map(md => md ? computeMetadataRoot(md) : ethers.ZeroHash) : hashes!.map(() => ethers.ZeroHash);

      // Store hashes and cryptographic commitments
      const txHash = await writeHashesBatch(hashes, metadataRoots);
      const env = getEnv();
      const explorerUrl = txExplorerUrl(txHash, parseInt(env.CHAIN_ID, 10), env.RPC_URL);
      return res.json({ txHash, explorerUrl });
    }

    return res.status(400).json({ error: 'invalid_operation' });
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : 'unknown_error';
    return res.status(500).json({ error: 'write_failed', message });
  }
});

// Verification endpoint: client provides hash for verification
const verifySchema = z.object({
  hash: z.string(), // Hash recomputed by client
  metadata: z.string().optional() // Current metadata for cryptographic comparison (as JSON string)
});

// Changed from POST to GET since we're only reading/verifying data
router.get('/verify', authenticateJwt, async (req, res) => {
  // Parse query parameters instead of request body
  const parsed = verifySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const { hash, metadata } = parsed.data;

  try {
    // Check if hash exists on blockchain and get comprehensive info
    let checkResult;
    try {
      checkResult = await checkExists(hash);
    } catch (checkError: any) {
      console.error('checkExists failed:', checkError);
      return res.status(500).json({ 
        error: 'blockchain_check_failed', 
        message: checkError.message || 'Failed to check hash existence',
        details: checkError.code || 'unknown_code'
      });
    }

    if (!checkResult.exists) {
      return res.json({ 
        verified: false, 
        error: 'hash_not_found',
        network: checkResult.network,
        query: checkResult.query
      });
    }

    // Convert BigInt in record to string for JSON serialization
    const serializedRecord = checkResult.record ? {
      ...checkResult.record,
      timestamp: checkResult.record.timestamp.toString()
    } : undefined;

    // If no metadata provided, just check existence
    if (!metadata) {
      return res.json({ 
        verified: true,
        record: serializedRecord,
        network: checkResult.network,
        query: checkResult.query
      });
    }

    // Parse metadata JSON string
    let metadataObj: Record<string, any>;
    try {
      metadataObj = JSON.parse(metadata);
    } catch (parseError) {
      return res.status(400).json({ error: 'invalid_metadata_json' });
    }

    // Hash exists, now compare cryptographic commitments
    let record;
    try {
      record = await getRecord(hash);
      console.log('Fetched record from blockchain:', record);
    } catch (recordError: any) {
      console.error('getRecord failed:', recordError);
      return res.status(500).json({ 
        error: 'record_fetch_failed', 
        message: recordError.message || 'Failed to fetch record from blockchain',
        details: recordError.code || 'unknown_code'
      });
    }

    const currentMetadataRoot = computeMetadataRoot(metadataObj);

    // Compare with stored metadata root
    if (currentMetadataRoot === record.metadataRoot) {
      return res.json({ 
        verified: true,
        record: serializedRecord,
        network: checkResult.network,
        query: checkResult.query
      });
    }

    // If they don't match, verification failed - return what changed
    return res.json({
      verified: false,
      error: 'metadata_changed',
      details: 'Metadata cryptographic commitment does not match stored commitment',
      diffs: deepDiff(record, metadataObj), // Return the diffs
      record: serializedRecord,
      network: checkResult.network,
      query: checkResult.query
    });
  } catch (e: any) {
    console.error('Verification failed:', e);
    const message = typeof e?.message === 'string' ? e.message : 'unknown_error';
    return res.status(500).json({ 
      error: 'verification_failed', 
      message,
      details: e?.code || 'unknown_code'
    });
  }
});

// Utility function to compute cryptographic commitment of metadata
function computeMetadataRoot(metadata: Record<string, any>): string {
  try {
    // Sort keys to ensure consistent ordering
    const sortedKeys = Object.keys(metadata).sort();
    const sortedEntries = sortedKeys.map(key => {
      const value = metadata[key];
      // Handle different data types consistently
      let stringValue: string;
      if (typeof value === 'object' && value !== null) {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }
      return `${key}:${stringValue}`;
    });
    const concatenated = sortedEntries.join('|');
    
    // Compute sha256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(concatenated);
    return ethers.sha256(data);
  } catch (error) {
    throw new Error('Failed to compute metadata root');
  }
}

export default router;