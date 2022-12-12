require("hardhat-deploy");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require("dotenv").config({path: __dirname+"/.env"})

const COIN_MARKET_API_KEY = process.env.COIN_MARKET_API_KEY
const GOERLI_RPC_URL =
    process.env.GOERLI_RPC_URL
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
        chainId: 31337,
    },
    goerli: {
      chainId: 5,
      accounts: [GOERLI_PRIVATE_KEY],
      url: GOERLI_RPC_URL,
      blockConfirmation: 6,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
      },
      {
        version: "0.6.6",
      }
    ],
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },

  namedAccounts: {
    deployer: {
      default: 0,
    }
  },
  mocha: {
    timeout: 600000, // 500 seconds max for running tests
},
};
