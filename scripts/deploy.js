// scripts/deploy.js
const hre = require("hardhat");
const { ethers, network } = hre;

async function estimateDeployment() {
  const [deployer] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("HashStore");

  // Get current gas price - CORRECT METHOD
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice;

  // Estimate gas for deployment
  const deploymentGas = await ethers.provider.estimateGas(
    factory.getDeployTransaction("0x2718A36bf02fcE4434c901c6C6E8D5FE3DE10a90")
  );

  const estimatedCost = deploymentGas * gasPrice;
  const estimatedCostETH = ethers.formatEther(estimatedCost);

  console.log("\n📊 Deployment Cost Estimation:");
  console.log("===========================================");
  console.log("Network:", network.name);
  console.log("Gas estimate:", deploymentGas.toString());
  console.log("Gas price:", ethers.formatUnits(gasPrice, "gwei"), "Gwei");
  console.log("Estimated cost:", estimatedCostETH, "ETH");

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceETH = ethers.formatEther(balance);
  console.log("Deployer balance:", balanceETH, "ETH");

  if (balance < estimatedCost) {
    console.log("❌ Insufficient funds!");
    console.log(`Required: ${estimatedCostETH} ETH`);
    console.log(`Available: ${balanceETH} ETH`);
    console.log(
      `Shortfall: ${ethers.formatEther(estimatedCost - balance)} ETH`
    );
  } else {
    console.log("✅ Sufficient funds available!");
  }
  console.log("===========================================");

  return { deploymentGas, gasPrice, estimatedCost };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n===========================================");
  console.log("Deploying HashStore Contract");
  console.log("===========================================");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("Deployer address:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("\n❌ Error: Deployer account has no ETH balance!");
    console.error("Please fund the account before deploying.");
    process.exit(1);
  }

  console.log("\n💰 Estimating deployment cost...");

  try {
    const factory = await ethers.getContractFactory("HashStore");

    // Estimate cost first
    const estimation = await estimateDeployment();

    if (balance < estimation.estimatedCost) {
      console.error("\n❌ Insufficient balance for deployment!");
      process.exit(1);
    }

    console.log("\n📦 Deploying contract...");

    // Deploy with estimated gas + buffer
    const gasLimit = (estimation.deploymentGas * 110n) / 100n; // 10% buffer
    console.log("Gas limit with buffer:", gasLimit.toString());

    const contract = await factory.deploy(
      "0x2718A36bf02fcE4434c901c6C6E8D5FE3DE10a90",
      {
        gasLimit: gasLimit,
        gasPrice: estimation.gasPrice,
      }
    );

    console.log("⏳ Waiting for deployment transaction to be mined...");
    console.log("Transaction hash:", contract.deploymentTransaction()?.hash);

    // Wait for deployment
    await contract.waitForDeployment();

    const address = await contract.getAddress();

    // Show actual gas used
    const receipt = await ethers.provider.getTransactionReceipt(
      contract.deploymentTransaction()?.hash
    );

    if (receipt) {
      const actualGasUsed = receipt.gasUsed;
      const actualCost = actualGasUsed * estimation.gasPrice;
      const actualCostETH = ethers.formatEther(actualCost);

      console.log("\n📊 Deployment Analytics:");
      console.log("===========================================");
      console.log("Actual gas used:", actualGasUsed.toString());
      console.log("Actual deployment cost:", actualCostETH, "ETH");
      console.log(
        "Gas efficiency:",
        (
          (Number(actualGasUsed) / Number(estimation.deploymentGas)) *
          100
        ).toFixed(2) + "%"
      );
    }

    console.log("\n✅ Deployment successful!");
    console.log("===========================================");
    console.log("Contract address:", address);
    console.log("===========================================");

    return address;
  } catch (error) {
    console.error("\n❌ Deployment failed!");
    console.error("Error details:", error.message);

    if (error.message.includes("insufficient funds")) {
      console.error("The gas estimation might have been inaccurate");
    }

    throw error;
  }
}

// Export functions for testing
module.exports = { estimateDeployment, main };

// Run main if script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
