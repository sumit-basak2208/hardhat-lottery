const { network, ethers } = require("hardhat")
const {developmentChains} = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25")
const GAS_LINK_PRICE = 1e9

module.exports = async({deployments, getNamedAccounts}) => {
    const {deploy, log} = deployments
    const {deployer} = await getNamedAccounts()

    const args = [BASE_FEE, GAS_LINK_PRICE]
    if(developmentChains.includes(network.name))
    {
        log("Local-chain detected!!!\nDeploying Mocks...")
        const vrfCoordinatorV2Mock = await deploy("VRFCoordinatorV2Mock",{
            from: deployer,
            log: true,
            args: args,
            waitConfirmations: network.config.blockConfirmation | 1,
        })
        log("Mocks Deployed.")
        log("------------------------------------------------------------------------------------------------")
    }
}

module.exports.tags = ["all","mocks"]