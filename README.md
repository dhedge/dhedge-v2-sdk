# dHEDGE V2 SDK

🛠 A complete implementation for building applications on top of dHEDGE V2

**Features:**

- Built with [ethers.js](https://docs.ethers.io/)
- Create and manage V2 pools from background app or your own dApp
- Easy-to-use functions to trade assets, provide liquidity or stake assets
- Useful for creating automated trading bots
- Use in your Javascript or Typescript project with full Typescript source

## Installation

### Node

```
npm install @dhedge/v2-sdk
```

### Yarn

```
yarn add @dhedge/v2-sdk
```

## Usage

### Initial setup

Initialize the sdk with an [ethers wallet](https://docs.ethers.io/v4/api-wallet.html) and the network.

```
import { Dhedge, Dapp, Network, ethers } from "@dhedge/v2-sdk";

const privateKey = "YOUR_PRIVATE_KEY";
const providerUrl = "https://polygon-mainnet.infura.io/v3/{YOUR_PROJECT_ID}"

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const walletWithProvider = new ethers.Wallet(privateKey, provider);

const dhedge = new Dhedge(walletWithProvider, Network.POLYGON);
```

### Create pool

Create a pool with USDC and WETH enabled assets, but only USDC available for deposit.

```
const usdcTokenAddress = "USDC_TOKEN_ADDRESS"
const wethTokenAddress = "WETH_TOKEN_ADDRESS"
const pool = await dhedge.createPool(
  "Day Ralio",
  "Awseome Fund",
  "DRAF",
  [
    [usdcTokenAddress, true],
    [wethTokenAddress, true],
  ],
  10
)
console.log("created pool with address",pool.address)
```

### Load pool

```
const poolAddress = "YOUR_POOL_ADDRESS"
const pool = await dhedge.loadPool(poolAddress)
```

### Get pool composition

```
const composition = await pool.getComposition();
```

### Approve pool asset

Before trading an asset on platforms like Sushiswap or Unsiwap it needs to be approved.

Approve unlimted amount of USDC to trade on Sushiswap.

```
const tx = await pool.approve(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  ethers.constants.MaxInt256
)
```

Approve unlimted amound of SLP USDC-DAI token for staking on Sushiswap

```
const tx = await pool.approve(
  Dapp.SUSHISWAP,
  "SLP_UYSDC_DAI_TOKEN_ADDRESS",
  ethers.constants.MaxInt256,
  true
)
```

### Trade pool assets

Trade 1 USDC into DAI on Sushiswap

```
const amountIn = "1000000"
const minAmountOut = "997085"
const tx = await pool.trade(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  "DAI_TOKEN_ADDRESS",
  amountIn,
  minAmountOut
)
```

### Liquidity

Add USDC/DAI into a Sushiswap liquidity pool

```
const amountUsdc = "1000000"
const amountDai = "997085"
const tx = await pool.addLiquidity(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  "DAI_TOKEN_ADDRESS",
  amountUsdc,
  amountDai
)
```

Remove USDC/DAI worth of 1 Sushiswap LP from the liquidity pool

```
const amountSlpUsdcDai = "1000000000000000000"
const tx = await pool.removeLiquidity(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  "DAI_TOKEN_ADDRESS",
  amountSlpUsdcDai
)
```

### Staking

Stake 1 Sushiswap LP USDC/DAI token

```
const amountSlpUsdcDai = "1000000000000000000"
const tx = await pool.stake(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS",
  amountSlpUsdcDai
)
```

1 Sushiswap LP USDC/DAI token

```
const amountSlpUsdcDai = "1000000000000000000"
const tx = await pool.unstake(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS",
  amountSlpUsdcDai
)
```

Harvest rewards from staked Sushiswap LP USDC/DAI tokens

```
const tx = await pool.harvestStakingRewards(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS"
)
```
