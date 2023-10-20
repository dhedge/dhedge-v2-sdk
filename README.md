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

If you want to use 1Inch to trade pool assets you need to apply for an API key at [1Inch Dev Portal](https://docs.1inch.io/docs/aggregation-protocol/introduction).
Then you need to copy .env.example file to .env and set your url there.

```
ONEINCH_API_KEY=YOUR_API_KEY_FROM_1INCH
```

Initialize the sdk with an [ethers wallet](https://docs.ethers.io/v5/api/signer/#Wallet) and the network.

```
import { Dhedge, Dapp, Network, ethers } from "@dhedge/v2-sdk";

const privateKey = "YOUR_PRIVATE_KEY";
const providerUrl = "https://polygon-mainnet.infura.io/v3/{YOUR_PROJECT_ID}"

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const walletWithProvider = new ethers.Wallet(privateKey, provider);

const dhedge = new Dhedge(walletWithProvider, Network.POLYGON);
```

### Create pool

Create a pool.

USDC and DAI enabled assets, but only USDC available for deposit.

```
const usdcTokenAddress = "USDC_TOKEN_ADDRESS"
const daiTokenAddress = "DAI_TOKEN_ADDRESS"
const pool = await dhedge.createPool(
  "Day Ralio",
  "Awesome Fund",
  "DRAF",
  [
    [usdcTokenAddress, true],
    [daiTokenAddress, false],
  ],
  10
)
console.log("created pool with address", pool.address)
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

### Change pool assets (enable/disable)

Change pool assets to allow DAI for deposits. Also enable WETH as an asset, but shouldn't be allowed as deposit.

```
const enabledAssets = [
  { asset: "USDC_TOKEN_ADDRESS", isDeposit: true },
  { asset: "DAI_TOKEN_ADDRESS", isDeposit: true },
  { asset: "WETH_TOKEN_ADDRESS", isDeposit: false },
]
const tx = await pool.changeAssets(enabledAssets)
```

### Set trader

Set an account with trading permissions

```
const tx = await pool.setTrader("TRADER_ACCOUNT_ADDRESS")
```

### Approve asset for deposit

Before depositing an asset into a Pool, it needs to be approved.

Approve unlimited amount of USDC to deposit into Pool.

```
const tx = await pool.approveDeposit("USDC_TOKEN_ADDRESS", ethers.constants.MaxUint256);
```

### Deposit asset into pool

Deposit 1 USDC into Pool

```
const usdcDepositAmount = "100000"
const tx = await pool.deposit("USDC_TOKEN_ADDRESS", usdcDepositAmount);
```

### Withdraw from pool

Withdraw 1.00002975 pool tokens. Note that this cannot be called if set as Trader account

```
const poolTokensWithdrawAmount = "1000029750000000000"
const tx = await pool.withdraw(poolTokensWithdrawAmount);
```

### Approve pool asset for trading & staking

Before trading an asset on platforms like Sushiswap it needs to be approved.

Approve unlimited amount of USDC to trade on Sushiswap

```
const tx = await pool.approve(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  ethers.constants.MaxInt256
)
```

### Trade pool assets

Trade 1 USDC into DAI on Sushiswap (other options: QUICKSWAP, BALANCER, or ONEINCH)

```
const amountIn = "1000000"
const slippage = 0.5
const tx = await pool.trade(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  "DAI_TOKEN_ADDRESS",
  amountIn,
  slippage
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

Add 0.00002 WBTC, 1 USDC and 0.0002 WETH to a WBTC/USDC/WETH Balancer pool

```
const balancerPoolId = "0x03cd191f589d12b0582a99808cf19851e468e6b500010000000000000000000a"
const assets = [WBTC_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS, WETH_TOKEN_ADDRESS];
const amounts = ["2000", "1000000", "200000000000000"];
const tx = await pool.joinBalancerPool(balancerPoolId, assets, amounts)
```

Remove all tokens from WBTC/USDC/WETH Balancer pool

```
const amount = await dhedge.utils.getBalance(BALANCER_LP_TOKEN_ADDRESS, pool.address)
const tx = await pool.exitBalancerPool(balancerPoolId, assets, amount)
```

Harvest rewards from Balancer

```
const tx = await pool.harvestBalancerRewards()
```

### Staking

Approve unlimited amound of SLP USDC-DAI token for staking on Sushiswap

```
const tx = await pool.approveStaking(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS",
  ethers.constants.MaxInt256
)
```

Stake 1 Sushiswap LP USDC/DAI token

```
const amountSlpUsdcDai = "1000000000000000000"
const tx = await pool.stake(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS",
  amountSlpUsdcDai
)
```

Unstake 1 Sushiswap LP USDC/DAI token

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
const tx = await pool.harvestRewards(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS"
)
```

### Lending/Borrowing Aave

Deposit 1 USDC into Aave lending pool

```
const tx = await pool.lend(Dapp.AAVE, USDC_TOKEN_ADDRESS, "1000000")
```

Withdraw 1 USDC from Aave lending pool

```
const tx = await pool.withdrawDeposit(Dapp.AAVE, USDC_TOKEN_ADDRESS, "1000000")
```

Borrow 0.0001 WETH from Aave lending pool

```
const tx = await pool.borrow(Dapp.AAVE, WETH_TOKEN_ADDRESS, "100000000000000");
```

Repay 0.0001 WETH to Aave lending pool

```
const tx = await pool.repay(Dapp.AAVE, WETH_TOKEN_ADDRESS, "100000000000000");
```

Harvest rewards from Aave

```
const tx = await pool.harvestAaveRewards([
    AAVE_USDC_ADDRESS,
    AAVE_WETH_DEBT_ADDRESS
  ]);
```
