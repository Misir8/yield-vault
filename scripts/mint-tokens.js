const hre = require("hardhat");

async function main() {
  console.log("🪙 Minting USDT tokens...\n");

  const [deployer] = await hre.ethers.getSigners();
  
  // Ваш адрес
  const targetAddress = "0xbbbEe6E7922fB8044600C92EABe9818a71b67a64";
  
  // Адрес контракта MockStableToken (обновлен после передеплоя)
  const stableTokenAddress = "0xe70f935c32dA4dB13e7876795f1e175465e6458e";
  
  // Подключаемся к контракту
  const MockStableToken = await hre.ethers.getContractFactory("MockStableToken");
  const stableToken = MockStableToken.attach(stableTokenAddress);
  
  // Минтим 100,000 USDT (6 decimals для USDT)
  const mintAmount = hre.ethers.parseUnits("100000", 6);
  
  console.log(`Minting ${hre.ethers.formatUnits(mintAmount, 6)} USDT to ${targetAddress}...`);
  
  const tx = await stableToken.connect(deployer).mint(targetAddress, mintAmount);
  await tx.wait();
  
  // Проверяем баланс
  const balance = await stableToken.balanceOf(targetAddress);
  
  console.log(`✅ Success!`);
  console.log(`   Transaction: ${tx.hash}`);
  console.log(`   New balance: ${hre.ethers.formatUnits(balance, 6)} USDT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
