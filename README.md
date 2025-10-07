## ds-smartContract API (Production-Ready)

Secure REST API (Express + TypeScript) for writing and verifying metadata hashes on EVM chains (Ethereum, Polygon, etc.). Includes Hardhat contract and deployment tooling.

### Highlights

- JWT security: short-lived access tokens, rotating refresh tokens, claim validation (iss, aud, exp)
- Client credentials flow (appid/appsecret) without a database
- Ethers v6 with env-driven networks; owner-only writes; batch writes
- Zod request validation, Helmet, rate limiting, logging (pino)
- Read caching and verification endpoint with deep-diff
- Hardhat-based contract deployment and automated ABI export
- Docker image for production deployment and graceful shutdown
- **🚀 Ready for Render deployment with optimized Dockerfile**

---

## 🚀 Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

1. **Fork this repository** to your GitHub account
2. **Connect to Render** - Sign up/login at [render.com](https://render.com)
3. **Create Web Service** - Select your forked repository
4. **Auto-deploy** - Choose "Auto-deploy from render.yaml"
5. **Set Environment Variables** - Add your blockchain credentials (see `DEPLOYMENT.md`)
6. **Deploy** - Your API will be live at `https://your-app.onrender.com`

📖 **Detailed deployment guide**: See [`DEPLOYMENT.md`](./DEPLOYMENT.md)

---

## 1. Requirements

- Node 22.10+ (or latest Active LTS). Required by Hardhat and ESM.
- An RPC URL (Ethereum/Polygon/etc.) and a funded deployer `PRIVATE_KEY`.

Optional:

- Etherscan-like API key for verification (if desired)

---

## 2. Quick Start (Development)

1. Install dependencies

```bash
npm install
```

2. Copy environment

```bash
cp .env.example .env
# Fill in: APP_ID, APP_SECRET, RPC_URL, CHAIN_ID, PRIVATE_KEY, JWT_* secrets
```

3. Start server (dev)

```bash
npm run dev
```

Health check: `GET /health`

---

## 3. Environment Configuration (.env)

- General
  - `NODE_ENV` (development|production)
  - `PORT` (default 4000)
  - `CORS_ORIGIN` (allowed origins, `*` for any)
- JWT
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (strong secrets)
  - `JWT_ISSUER`, `JWT_AUDIENCE`
  - `ACCESS_TOKEN_TTL` (e.g., 15m), `REFRESH_TOKEN_TTL` (e.g., 7d)
- Client Credentials
  - `APP_ID`, `APP_SECRET` (server validates directly; no DB)
- Blockchain
  - `RPC_URL`, `CHAIN_ID`, `PRIVATE_KEY`
  - `CONTRACT_ADDRESS` (set after deploy)

Switching networks: update `RPC_URL` and `CHAIN_ID` only.

---

## 4. Smart Contract and Deployment

Contract: `contracts/HashStore.sol`

- `store(bytes32)` and `storeBatch(bytes32[])` are `onlyOwner`
- `exists(bytes32) -> bool`

Compile and export ABI (requires supported Node):

```bash
npm run compile
```

- Artifacts: `artifacts/contracts/HashStore.sol/HashStore.json`
- ABI export: `src/abi/HashStore.json` (auto via `scripts/export-abi.js`)

Deploy to configured network:

```bash
NETWORK=custom npx hardhat run scripts/deploy.ts --network custom
# After deploy, put the address into .env as CONTRACT_ADDRESS
```

Tip: You can verify configuration in `hardhat.config.ts` (network `custom` uses `RPC_URL`, `CHAIN_ID`, `PRIVATE_KEY`).

---

## 5. Security & Production Hardening

- Helmet, CORS, compression, rate limiting (120 req/min default)
- JWT best practices:
  - Access tokens short-lived; refresh tokens long-lived
  - Rotation: each refresh invalidates the previous token
  - Claims validated (iss, aud, exp); only `type=access` allowed for protected routes
- No DB by design: client credentials validated against `.env`
- Express `trust proxy` enabled for proxy/load balancer setups
- Centralized error handling and a 404 handler
- Graceful shutdown on SIGINT/SIGTERM

Recommended Ops:

- Run behind a reverse proxy (Nginx/ALB) with TLS termination
- Configure per-origin CORS and stricter rate limits per deployment
- Rotate JWT secrets periodically
- Use separate keys for staging and production

---

## 6. API Reference

Authorization header: `Authorization: Bearer <accessToken>` for protected endpoints.

- Obtain tokens

```http
POST /auth/token
Content-Type: application/json
{
  "appid": "<APP_ID>",
  "appsecret": "<APP_SECRET>"
}
```

Response:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": "15m"
}
```

- Refresh tokens

```http
POST /auth/refresh
Content-Type: application/json
{ "refreshToken": "..." }
```

Response:

```json
{ "accessToken": "...", "refreshToken": "..." }
```

- Write hash (single or batch)

```http
POST /blockchain/write
Authorization: Bearer <access>
Content-Type: application/json
{ "hash": "0x<64-hex>", "metadata": { "optional": "data" } }
# or
{ "hashes": ["0x<64-hex>", "0x<64-hex>"], "metadatas": [{ "optional": "data" }] }
```

Response:

```json
{ "txHash": "0x...", "explorerUrl": "https://.../tx/0x..." }
```

- Read

```http
GET /blockchain/read?hash=0x<64-hex>
GET /blockchain/read?tx=0x<txhash>
GET /blockchain/read?txUrl=<explorer-url>
```

Response for `hash`:

```json
{ "exists": true }
```

Response for `tx`/`txUrl`:

```json
{ "blockNumber": 12345, "status": 1, "logs": 2 }
```

- Verify

```http
GET /blockchain/verify?hash=0x<64-hex>&metadata={"optional":"json"}
Authorization: Bearer <access>
```

Response:

```json
{ "verified": true }
```

If verification fails:

```json
{ "verified": false, "error": "metadata_changed", "details": "..." }
```

---

## 7. How Verification Works

- Client computes deterministic JSON of metadata (sorted keys, stable arrays) and keccak256 hash.
- Server computes or uses provided `expectedHash`, checks on-chain `exists(hash)`.
- If not found and `diff=true` with `originalMetadata`, server returns a deep-diff between original and provided metadata to indicate which parts changed.

On-chain best practice: treat the on-chain existence as the source of truth; the client should keep the original metadata to enable meaningful diffs.

---

## 8. Production Deployment

### Docker

Build image:

```bash
docker build -t ds-smart-api:latest .
```

Run container:

```bash
docker run --rm -p 4000:4000 --env-file .env ds-smart-api:latest
```

### PM2 (alternative)

```bash
npm run build
pm2 start dist/index.js --name ds-smart-api
```

### Environment & Scaling

- Set `NODE_ENV=production`
- Tune rate limits and request body size
- Horizontal scaling: ensure the deployer `PRIVATE_KEY` is consistent, or externalize writes behind a queue if needed

### Render.com Deployment

To deploy on Render.com with proper CORS configuration:

1. Fork this repository on GitHub
2. Create a new Web Service on Render.com
3. Connect it to your forked repository
4. In the "Environment" section, add these variables:
   ```
   NODE_ENV=production
   PORT=4000
   CORS_ORIGIN=https://ds-smartcontract1.onrender.com,http://localhost:3000
   ```
   (Include any other required environment variables from `.env.example`)
5. Set the build command to: `npm run build`
6. Set the start command to: `npm run start`

The CORS configuration will now allow requests from both your Render.com deployment and localhost for development.

---

## 9. Developer Notes

- ABI source: `src/abi/HashStore.json` (auto-populated by `npm run compile`)
- To change contract, update Solidity and re-run `npm run compile` to refresh ABI
- Ethers v6 is used; ensure imports match v6 style

---

## 10. Troubleshooting

- Hardhat compile errors about Node: upgrade to Node 22.10+ or latest Active LTS
- Missing `CONTRACT_ADDRESS`: deploy first, then set it in `.env`
- `invalid_token`: ensure JWT claims and secrets match server config
- CORS issues: set `CORS_ORIGIN` explicitly (avoid `*` in production)

---

## 11. Scripts

- `npm run dev` – start dev server (nodemon)
- `npm run build` – compile TypeScript
- `npm run start` – run compiled server
- `npm run compile` – Hardhat compile + export ABI
- `npm run deploy` – deploy via Hardhat to `$NETWORK` (uses `RPC_URL/CHAIN_ID/PRIVATE_KEY`)

---

## 12. Complete Documentation

For detailed documentation on all aspects of the system, please see the [docs](docs/README.md) directory:

- [System Architecture](docs/system-architecture.md)
- [API Reference](docs/api-reference.md)
- [Workflow](docs/workflow.md)
- [Cryptography](docs/cryptography.md)
- [Client Implementation](docs/client-implementation.md)
- [Smart Contract](docs/smart-contract.md)
- [Deployment and Operations](docs/deployment.md)

---

## 13. License

MIT
