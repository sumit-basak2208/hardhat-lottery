const { ethers, network, deployments } = require("hardhat");
const fs = require("fs");

const FRONT_END_ADDRESS_FILE =
  "../nextjs-lottery/constants/contractAddresses.json";
const FRON_END_ABI_FILE = "../nextjs-lottery/constants/abi.json";

module.exports = async () => {
  await updateContractAddreses();
  await updateAbiCode();
};

async function updateAbiCode() {
  const raffle = await ethers.getContract("Raffles");
  fs.writeFileSync(
    FRON_END_ABI_FILE,
    raffle.interface.format(ethers.utils.FormatTypes.json)
  );
}

async function updateContractAddreses() {
  const raffle = await ethers.getContract("Raffles");
  const chainId = network.config.chainId.toString();
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESS_FILE, "utf8")
  );
  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(raffle.address)) {
      currentAddresses[chainId].push(raffle.address);
    }
  } else {
    currentAddresses[chainId] = [raffle.address];
  }
  fs.writeFileSync(FRONT_END_ADDRESS_FILE, JSON.stringify(currentAddresses));
}

module.exports.tags = ["all", "frontend"];
