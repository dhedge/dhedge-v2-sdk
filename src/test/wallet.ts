import { ethers } from "ethers"

require("dotenv").config()

const provider = new ethers.providers.JsonRpcProvider(
  `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
)

export const wallet = new ethers.Wallet(
  process.env.PRIVATE_KEY as string,
  provider
)
