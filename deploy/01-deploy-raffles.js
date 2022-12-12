const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ deployments, getNamedAccounts }) => {
  const { log, deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  const interval = networkConfig[chainId].interval;
  const keyHash = networkConfig[chainId].keyHash;
  const callBackGasLimit = networkConfig[chainId].callBackGasLimit;
  const fee = networkConfig[chainId].fee;
  let vrfCoordinatorAddress, vrfCoordinator, subId;

  if (developmentChains.includes(network.name)) {
    vrfCoordinator = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorAddress = vrfCoordinator.address;
    const txrec = await vrfCoordinator.createSubscription();
    const txres = await txrec.wait(1);
    subId = txres.events[0].args.subId;
    await vrfCoordinator.fundSubscription(subId, ethers.utils.parseEther("30"));
  } else {
    vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinator;
    subId = networkConfig[chainId].subId;
  }

  const args = [
    vrfCoordinatorAddress,
    interval,
    fee,
    keyHash,
    subId,
    callBackGasLimit,
  ];

  const raffles = await deploy("Raffles", {
    from: deployer,
    log: true,
    args: args,
    waitConfirmations: network.config.blockConfirmation | 1,
  });

  log("Raffles contract deployed...");

  if (!developmentChains.includes(network.name)) {
    log("Verifying Raffles contract");
    //verify(raffles.address, args)
  } else await vrfCoordinator.addConsumer(subId, raffles.address);
};

module.exports.tags = ["all", "raffles"];
