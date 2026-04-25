const hre = require("hardhat");

async function main() {
  console.log("🪙 Minting USDT tokens...\n");

  const [deployer] = await hre.ethers.getSigners();
  
  // Ваш адрес
  const targetAddress = "0xbbbEe6E7922fB8044600C92EABe9818a71b67a64";
  
  // Адрес контракта MockStableToken
  const stableTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Подключаемся к контракту
  const MockStableToken = await hre.ethers.getContractFactory("MockStableToken");
  const stableToken = MockStableToken.attach(stableTokenAddress);
  
  // Минтим 100,000 USDT
  const mintAmount = hre.ethers.parseUnits("100000", 18);
  
  console.log(`Minting ${hre.ethers.formatUnits(mintAmount, 18)} USDT to ${targetAddress}...`);
  
  const tx = await stableToken.connect(deployer).mint(targetAddress, mintAmount);
  await tx.wait();
  
  // Проверяем баланс
  const balance = await stableToken.balanceOf(targetAddress);
  
  console.log(`✅ Success!`);
  console.log(`   Transaction: ${tx.hash}`);
  console.log(`   New balance: ${hre.ethers.formatUnits(balance, 18)} USDT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
