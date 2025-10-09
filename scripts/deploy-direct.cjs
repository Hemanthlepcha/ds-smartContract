// Direct deployment script bypassing hardhat-ethers bug
require("dotenv/config");
const ethers = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n===========================================");
  console.log("Deploying HashStore Contract (Direct Method)");
  console.log("===========================================");

  // Load contract ABI and bytecode
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/HashStore.sol/HashStore.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Network:", (await provider.getNetwork()).name);
  console.log("Chain ID:", (await provider.getNetwork()).chainId.toString());
  console.log("Deployer address:", wallet.address);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("\n❌ Error: Deployer account has no ETH balance!");
    process.exit(1);
  }

  // Create contract factory
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log("\n💰 Estimating deployment cost...");

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log(
    "Current gas price:",
    ethers.formatUnits(gasPrice, "gwei"),
    "Gwei"
  );

  // Estimate gas
  const deployTx = await factory.getDeployTransaction(
    "0x2718A36bf02fcE4434c901c6C6E8D5FE3DE10a90"
  );
  const gasEstimate = await provider.estimateGas(deployTx);
  console.log("Gas estimate:", gasEstimate.toString());

  const estimatedCost = gasEstimate * gasPrice;
  const estimatedCostETH = ethers.formatEther(estimatedCost);
  console.log("Estimated cost:", estimatedCostETH, "ETH");

  if (balance < estimatedCost) {
    console.error("\n❌ Insufficient balance!");
    process.exit(1);
  }

  console.log("✅ Sufficient funds available!");

  console.log("\n📦 Deploying contract...");

  // Deploy the contract
  const gasLimit = (gasEstimate * 110n) / 100n; // 10% buffer
  const deploymentTx = await wallet.sendTransaction({
    ...deployTx,
    gasLimit: gasLimit,
    gasPrice: gasPrice,
  });

  console.log("✅ Transaction sent!");
  console.log("Transaction hash:", deploymentTx.hash);
  console.log(
    "View on Etherscan: https://etherscan.io/tx/" + deploymentTx.hash
  );

  console.log("\n⏳ Waiting for transaction to be mined...");

  // Manually wait for the transaction to avoid ethers v6 bug
  let receipt = null;
  let attempts = 0;
  while (!receipt && attempts < 60) {
    try {
      receipt = await provider.getTransactionReceipt(deploymentTx.hash);
      if (receipt) break;
    } catch (e) {
      // Ignore errors while waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
    attempts++;
    if (attempts % 5 === 0) {
      console.log(`Still waiting... (${attempts * 3}s elapsed)`);
    }
  }

  if (!receipt) {
    console.log("\n⚠️  Transaction is taking longer than expected to mine");
    console.log(
      "Check Etherscan: https://etherscan.io/tx/" + deploymentTx.hash
    );
    console.log(
      "The deployment may still succeed. Check back in a few minutes."
    );
    process.exit(0);
  }

  if (receipt && receipt.contractAddress) {
    const contractAddress = receipt.contractAddress;

    console.log("\n✅ Contract deployed successfully!");
    console.log("===========================================");
    console.log("Contract address:", contractAddress);
    console.log(
      "View on Etherscan: https://etherscan.io/address/" + contractAddress
    );
    console.log("===========================================");

    // Show gas analytics
    const actualGasUsed = receipt.gasUsed;
    const actualCost = actualGasUsed * gasPrice;
    const actualCostETH = ethers.formatEther(actualCost);

    console.log("\n📊 Deployment Analytics:");
    console.log("===========================================");
    console.log("Block number:", receipt.blockNumber);
    console.log("Actual gas used:", actualGasUsed.toString());
    console.log("Actual cost:", actualCostETH, "ETH");
    console.log(
      "Gas efficiency:",
      ((Number(actualGasUsed) / Number(gasEstimate)) * 100).toFixed(2) + "%"
    );
    console.log("===========================================");

    console.log("\n📝 Next steps:");
    console.log(
      "1. Update your .env file with: CONTRACT_ADDRESS=" + contractAddress
    );
    console.log("2. Verify the contract on Etherscan (optional):");
    console.log(
      "   npx hardhat verify --network mainnet " +
        contractAddress +
        ' "0x2718A36bf02fcE4434c901c6C6E8D5FE3DE10a90"'
    );

    return contractAddress;
  } else {
    throw new Error("Deployment failed - no contract address in receipt");
  }
}

// Run the deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Deployment failed!");
      console.error("Error:", error.message);
      if (error.transaction) {
        console.error("Transaction hash:", error.transaction.hash);
      }
      process.exit(1);
    });
}

module.exports = { main };
