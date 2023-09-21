import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { verify } from "../helpers/verify";

async function deployContract() {
  let adminAccount;

  console.log(hre.network.name, "network name");
  [adminAccount] = await ethers.getSigners();
  const adminAddress = adminAccount.address;
  console.log(adminAddress, "address");

  const Vault = await ethers.getContractFactory("CoreVault");
  console.log("post vault init");

  const vaultContract = await upgrades.deployProxy(Vault, [], {
    initializer: "initialize",
  });
  await vaultContract.waitForDeployment();

  console.log(
    "Core Vault Contract Deployed to",
    await vaultContract.getAddress()
  );

  // after contract is deployed, you want to add collateral types to the system
  const collateraType = ethers.encodeBytes32String("USDC-A");
  const rate = BigInt("0");
  const price = BigInt("540");
  const debtCeiling = BigInt("10000000000000");
  const debtFloor = BigInt("1");
  const badDebtGracePeriod = BigInt("0");
  await vaultContract.createCollateralType(
    collateraType,
    rate,
    price,
    debtCeiling,
    debtFloor,
    badDebtGracePeriod
  );

  // deploy ngnx contract
  const NGNXToken = await ethers.getContractFactory("NGNX");
  const ngnxContract = await upgrades.deployProxy(NGNXToken, [[adminAddress]], {
    initializer: "initialize",
  });
  await ngnxContract.waitForDeployment();

  console.log(
    "NGNX Token contract deployed to",
    await ngnxContract.getAddress()
  );

  // Deploy Adapter contracts
  const vaultContractAddress = await vaultContract.getAddress();
  const usdcAddress = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F";
  const USDCAdapter = await ethers.getContractFactory("CollateralAdapter");
  const usdcAdaptercontract = await upgrades.deployProxy(
    USDCAdapter,
    [vaultContractAddress, collateraType, usdcAddress],
    {
      initializer: "initialize",
    }
  );
  await usdcAdaptercontract.waitForDeployment();

  console.log(
    "USDC Adapter Contract Deployed to",
    await usdcAdaptercontract.getAddress()
  );
  // Deploy ngnx Adapter contracts
  const NGNXAdapter = await ethers.getContractFactory("NGNXAdapter");
  const ngnxAddress = await ngnxContract.getAddress();
  const ngnxAdapterContract = await upgrades.deployProxy(
    NGNXAdapter,
    [vaultContractAddress, ngnxAddress],
    {
      initializer: "initialize",
    }
  );
  await ngnxAdapterContract.waitForDeployment();

  console.log(
    "NGNX Adapter Contract Deployed to",
    await ngnxAdapterContract.getAddress()
  );

  // collateral functions

  const collateralData = await vaultContract.getCollateralData(collateraType);
  console.log(collateralData[0].toString(), "TotalNormalisedDebt");
  console.log(BigInt(collateralData[1]).toString(), "TotalCollateralValue");
  console.log(BigInt(collateralData[2]).toString(), "rate");
  console.log(BigInt(collateralData[3]).toString(), "price");
  console.log(BigInt(collateralData[4]).toString(), "debt ceiling");
  console.log(BigInt(collateralData[5]).toString(), "debt floor");
  console.log(BigInt(collateralData[6]).toString(), "bad debt grace period");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployContract().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});