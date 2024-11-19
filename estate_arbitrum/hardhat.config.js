
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
const PRIVATE_KEY = 'e43a4e7d60baa828e3a7575e76c7d2034bb9990de1e7d262e8772f5b8d59cbb4';
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