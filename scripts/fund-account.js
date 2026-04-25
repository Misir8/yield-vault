const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Ваш адрес
  const targetAddress = "0xbbbEe6E7922fB8044600C92EABe9818a71b67a64"; // Замените на ваш полный адрес
  
  // Отправляем 100 ETH
  const tx = await deployer.sendTransaction({
    to: targetAddress,
    value: hre.ethers.parseEther("1000")
  });
  
  await tx.wait();
  
  console.log(`✅ Sent 100 ETH to ${targetAddress}`);
  console.log(`   Transaction: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
