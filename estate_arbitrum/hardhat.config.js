
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = "https://rpc.ankr.com/arbitrum_sepolia";
module.exports = {
  defaultNetwork: "arbitrum_sepolia",
  networks: {
    hardhat: {
      chainId: 421614,
    },
    arbitrum_sepolia: {
      url: RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true
    },
  },
};