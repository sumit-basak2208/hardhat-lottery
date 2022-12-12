const { ethers } = require("hardhat");

const networkConfig = {
  5: {
    name: "goerli",
    ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    vrfCoordinator: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    keyHash:
      "0x6e099d640cde6de9d40ac749b4b594126b0169747122711109c9985d47751f93",
    subId: 7107,
    interval: "30",
    fee: ethers.utils.parseEther("0.01"),
    callBackGasLimit: "500000",
  },

  31337: {
    name: "localhost",
    keyHash:
      "0x6e099d640cde6de9d40ac749b4b594126b0169747122711109c9985d47751f93",
    callBackGasLimit: "500000",
    fee: ethers.utils.parseEther("0.1"),
    interval: "30",
  },
};

const DECIMALS = "18";
const INITIAL_PRICE = "2000000000000000000000";
const developmentChains = ["hardhat", "localhost"];

module.exports = { DECIMALS, INITIAL_PRICE, networkConfig, developmentChains };
