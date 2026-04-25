const hre = require("hardhat");

async function main() {
  const userAddress = "0xbbbEe6E7922fB8044600C92EABe9818a71b67a64";
  const stableTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const vaultAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  const MockStableToken = await hre.ethers.getContractFactory("MockStableToken");
  const stableToken = MockStableToken.attach(stableTokenAddress);
  
  const balance = await stableToken.balanceOf(userAddress);
  const allowance = await stableToken.allowance(userAddress, vaultAddress);
  
  console.log(`Balance: ${hre.ethers.formatUnits(balance, 18)} USDT`);
  console.log(`Allowance: ${hre.ethers.formatUnits(allowance, 18)} USDT`);
}

main().catch(console.error);
