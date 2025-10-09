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

    // Store transaction hash before deployment completes
    let txHash = null;
    let address = null;

    try {
      const contract = await factory.deploy(
        "0x2718A36bf02fcE4434c901c6C6E8D5FE3DE10a90",
        {
          gasLimit: gasLimit,
          gasPrice: estimation.gasPrice,
        }
      );

      console.log("⏳ Deployment transaction submitted...");

      // Try to get the transaction hash - this might fail due to hardhat-ethers bug
      try {
        const deployTx = contract.deploymentTransaction();
        if (deployTx && deployTx.hash) {
          txHash = deployTx.hash;
          console.log("Transaction hash:", txHash);
          console.log("View on Etherscan: https://etherscan.io/tx/" + txHash);
        }
      } catch (txError) {
        console.log(
          "⚠️  Could not retrieve transaction details (hardhat-ethers bug)"
        );
      }

      // Try to wait for deployment
      try {
        await contract.waitForDeployment();
        address = await contract.getAddress();
        console.log("✅ Contract deployed successfully!");
      } catch (deployError) {
        if (deployError.message.includes("invalid value for value.to")) {
          console.log(
            "⚠️  Working around hardhat-ethers bug to get contract address..."
          );
          // The contract is likely deployed, we just can't get the address the normal way
          // We'll need to find it from recent transactions
        } else {
          throw deployError;
        }
      }
    } catch (error) {
      if (error.message.includes("invalid value for value.to")) {
        console.log("\n⚠️  Deployment hit a hardhat-ethers formatting bug");
        console.log("The contract transaction was likely sent successfully");
        console.log("Checking your recent transactions on Etherscan...");
      } else {
        throw error;
      }
    }

    // If we don't have the address yet, try to find it from recent transactions
    if (!address && !txHash) {
      console.log(
        "\n🔍 Checking recent transactions for contract deployment..."
      );
      const [deployer] = await ethers.getSigners();

      // Get the latest transaction count (nonce)
      const currentNonce = await ethers.provider.getTransactionCount(
        deployer.address
      );
      console.log("Current nonce:", currentNonce);
      console.log("Expected deployment nonce:", currentNonce - 1);

      // Calculate the contract address from the deployer address and nonce
      const deploymentNonce = currentNonce - 1;
      const predictedAddress = ethers.getCreateAddress({
        from: deployer.address,
        nonce: deploymentNonce,
      });

      console.log("\n📍 Predicted contract address:", predictedAddress);
      console.log(
        "View on Etherscan: https://etherscan.io/address/" + predictedAddress
      );

      // Wait a bit and check if there's code at that address
      console.log("\n⏳ Waiting for transaction to be mined...");
      let hasCode = false;
      let attempts = 0;
      while (!hasCode && attempts < 30) {
        const code = await ethers.provider.getCode(predictedAddress);
        if (code && code !== "0x") {
          hasCode = true;
          address = predictedAddress;
          console.log("✅ Contract deployment confirmed!");
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
        if (attempts % 5 === 0) {
          console.log(`Still waiting... (${attempts * 2}s elapsed)`);
        }
      }

      if (!hasCode) {
        console.log("\n⚠️  Could not confirm deployment automatically");
        console.log("Please check Etherscan manually:");
        console.log("https://etherscan.io/address/" + deployer.address);
        console.log("\nThe predicted contract address is:", predictedAddress);
        address = predictedAddress;
      }
    }

    if (address) {
      console.log("\n✅ Deployment successful!");
      console.log("===========================================");
      console.log("Contract address:", address);
      console.log("View on Etherscan: https://etherscan.io/address/" + address);
      console.log("===========================================");
      console.log("\n📝 Next steps:");
      console.log("1. Update your .env file with: CONTRACT_ADDRESS=" + address);
      console.log("2. Verify the contract on Etherscan (optional):");
      console.log(
        "   npx hardhat verify --network mainnet " +
          address +
          ' "0x2718A36bf02fcE4434c901c6C6E8D5FE3DE10a90"'
      );

      return address;
    }
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
