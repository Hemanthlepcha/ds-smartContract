# Render Deployment Guide

## Prerequisites

- GitHub repository with your code
- Render account
- Ethereum/Sepolia testnet wallet private key
- RPC URL (Alchemy, Infura, etc.)

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your repository has these files:

- `Dockerfile` (optimized for Render)
- `render.yaml` (deployment configuration)
- `package.json` with proper scripts
- Built `dist/` folder or source code

### 2. Connect to Render

1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click **"New +"** → **"Web Service"**
4. Select your repository: `ds-smartContract`
5. Choose deployment method:
   - **Option A**: Auto-deploy from `render.yaml` (Recommended)
   - **Option B**: Manual configuration

### 3. Configuration Options

#### Option A: Using render.yaml (Recommended)

1. Select **"Auto-deploy from render.yaml"**
2. Render will read the configuration automatically
3. You'll only need to set the sensitive environment variables

#### Option B: Manual Configuration

1. **Service Details**:

   - Name: `ds-smartcontract`
   - Region: `Oregon (US West)`
   - Branch: `main` or `dev`
   - Runtime: `Docker`

2. **Build & Deploy**:
   - Build Command: `docker build -t ds-smartcontract .`
   - Start Command: `docker run -p $PORT:$PORT ds-smartcontract`

### 4. Environment Variables

Set these in Render Dashboard → Environment:

#### Required Variables:

```
NODE_ENV=production
PORT=4000
JWT_ISSUER=ds-smartcontract
JWT_AUDIENCE=ds-smartcontract-users
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
APP_ID=production-app
CHAIN_ID=11155111
```

#### Auto-Generated Variables (Render will create these):

```
JWT_ACCESS_SECRET=[Auto-generated]
JWT_REFRESH_SECRET=[Auto-generated]
APP_SECRET=[Auto-generated]
```

#### Sensitive Variables (Set manually):

```
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_wallet_private_key_without_0x
CONTRACT_ADDRESS=your_deployed_contract_address
CORS_ORIGIN=https://your-app.onrender.com
```

### 5. Security Best Practices

1. **Private Key**: Use a dedicated wallet for deployment, not your main wallet
2. **RPC URL**: Use a reliable provider (Alchemy, Infura, QuickNode)
3. **CORS**: Set specific origins, avoid `*` in production
4. **Environment Variables**: Never commit sensitive data to git

### 6. Deployment Process

1. **Automatic Deployment**:

   - Push to your main/dev branch
   - Render automatically rebuilds and deploys
   - Monitor logs in Render dashboard

2. **Manual Deployment**:
   - Trigger from Render dashboard
   - Use "Manual Deploy" → "Deploy latest commit"

### 7. Verify Deployment

After deployment, test these endpoints:

1. **Health Check**: `https://your-app.onrender.com/health`
2. **API Documentation**: `https://your-app.onrender.com/docs`
3. **CORS Test**: `https://your-app.onrender.com/cors-test`

### 8. Monitoring

- **Logs**: Available in Render dashboard
- **Metrics**: CPU, Memory usage tracking
- **Alerts**: Set up notifications for downtime

## Troubleshooting

### Common Issues:

1. **Build Failures**:

   - Check Dockerfile syntax
   - Verify all dependencies in package.json
   - Review build logs

2. **Environment Variable Errors**:

   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure sensitive data is properly formatted

3. **CORS Errors**:

   - Update CORS_ORIGIN with your actual domain
   - Check allowed origins in code

4. **Blockchain Connection Issues**:
   - Verify RPC_URL is working
   - Check PRIVATE_KEY format (no 0x prefix)
   - Ensure CONTRACT_ADDRESS is correct

### Getting Help:

- Check Render documentation
- Review application logs
- Test locally with same environment variables

## Production Checklist

- [ ] Repository connected to Render
- [ ] All environment variables set
- [ ] CORS configured for production domain
- [ ] Health check endpoint working
- [ ] SSL certificate active (automatic on Render)
- [ ] Custom domain configured (if needed)
- [ ] Monitoring set up
- [ ] Backup strategy for private keys
