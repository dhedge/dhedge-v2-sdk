# dHEDGE V2 SDK

🛠 A complete implementation for building applications on top of dHEDGE V2

**Features:**

- Built with [ethers.js](https://docs.ethers.io/)
- Create and manage V2 pools from background app or your own dApp
- Easy-to-use functions to trade assets, provide liquidity or stake assets
- Useful for creating automated trading bots
- Use in your Javascript or Typescript project with full Typescript source
- All protocols and networks of [dHEDGE App](https://dhedge.org/management/create) are supported

## Installation

### Node

```bash
npm install @dhedge/v2-sdk
```

### Yarn

```bash
yarn add @dhedge/v2-sdk
```

## Usage

### Table of Contents

  <ol>
    <li>
      <a href="#initial-setup">Initial setup</a>
    </li>
      <li>
        <a href="#general-pool-management">General Pool Management</a>
        <ul>
          <li><a href="#1-create-pool">Create pool</a></li>
          <li><a href="#2-load-pool">Load pool</a></li>
          <li><a href="#3-get-pool-composition">Get pool composition</a></li>
          <li><a href="#4-change-pool-assets-enabledisable">Change pool assets</a></li>
          <li><a href="#5-set-trader">Set trader</a></li>
          <li><a href="#6-approve-asset-for-deposit">Approve asset for deposit</a></li>
          <li><a href="#7-deposit-asset-into-pool">Deposit asset into pool</a></li>
          <li><a href="#8-withdraw-from-pool">Withdraw from pool</a></li>
          <li><a href="#9-approve-pool-asset-for-trading--staking)">Approve pool asset for trading & staking</a></li>
          <li><a href="#10-trade-pool-assets">Trade pool assets</a></li>
        </ul>
    </li>
    <li>
       <a href="#liquidity">Liquidity</a>
        <ul>
            <li>
              <a href="#uniswap-v2-style">Uniswap-v2 style protocols </a>
            </li>
           <li>
              <a href="#balancer">Balancer</a>
            </li>
            <li>
              <a href="#uniswap-v3-style">Uniswap-v3 style protocols</a>
            </li>
            <li>
              <a href="#velodromev2--ramses">VelodromeV2 / Ramses</a>
            </li>
        </ul>
    </li>
    <li>
      <a href="#lendingborrowing-aave">Lending/Borrowing Aave</a>
    </li>

  </ol>

<br>

### Initial setup

---

If you want to use 1Inch to trade pool assets you need to apply for an API key at [1Inch Dev Portal](https://docs.1inch.io/docs/aggregation-protocol/introduction).
Then you need to copy .env.example file to .env and set your API key there.

```
ONEINCH_API_KEY=YOUR_API_KEY_FROM_1INCH
```

Initialize the sdk with an [ethers wallet](https://docs.ethers.io/v5/api/signer/#Wallet) and the network.

```ts
import { Dhedge, Dapp, Network, ethers } from "@dhedge/v2-sdk";

const privateKey = "YOUR_PRIVATE_KEY";
const providerUrl = "https://polygon-mainnet.infura.io/v3/{YOUR_PROJECT_ID}"

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const walletWithProvider = new ethers.Wallet(privateKey, provider);

const dhedge = new Dhedge(walletWithProvider, Network.POLYGON);
```

<br>

### General Pool Management

---

#### 1. Create a pool

USDC and DAI enabled assets, but only USDC available for deposit.

```ts
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

#### 2. Load pool

```ts
const poolAddress = "YOUR_POOL_ADDRESS"
const pool = await dhedge.loadPool(poolAddress)
```

#### 3. Get pool composition

```ts
const composition = await pool.getComposition();
```

#### 4. Change pool assets (enable/disable)

Change pool assets to allow DAI for deposits. Also enable WETH as an asset, but shouldn't be allowed as deposit.

```ts
const enabledAssets = [
  { asset: "USDC_TOKEN_ADDRESS", isDeposit: true },
  { asset: "DAI_TOKEN_ADDRESS", isDeposit: true },
  { asset: "WETH_TOKEN_ADDRESS", isDeposit: false },
]
const tx = await pool.changeAssets(enabledAssets)
```

#### 5. Set trader

Set an account with trading permissions

```ts
const tx = await pool.setTrader("TRADER_ACCOUNT_ADDRESS")
```

#### 6. Approve asset for deposit

Before depositing an asset into a Pool, it needs to be approved.

Approve unlimited amount of USDC to deposit into Pool.

```ts
const tx = await pool.approveDeposit("USDC_TOKEN_ADDRESS", ethers.constants.MaxUint256);
```

#### 7. Deposit asset into pool

Deposit 1 USDC into Pool

```ts
const usdcDepositAmount = "100000"
const tx = await pool.deposit("USDC_TOKEN_ADDRESS", usdcDepositAmount);
```

#### 8. Withdraw from pool

Withdraw 1.00002975 pool tokens. Note that this cannot be called if set as Trader account

```ts
const poolTokensWithdrawAmount = "1000029750000000000"
const tx = await pool.withdraw(poolTokensWithdrawAmount);
```

#### 9. Approve pool asset for trading & staking

Before trading an asset on platforms like Sushiswap it needs to be approved.

Approve unlimited amount of USDC to trade on Sushiswap

```ts
const tx = await pool.approve(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  ethers.constants.MaxInt256
)
```

#### 10. Trade pool assets

Trade 1 USDC into DAI on Sushiswap (other options: TOROS, QUICKSWAP, BALANCER, or ONEINCH)

```ts
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

---

#### Uniswap-v2 style

For Uniswap-v2 like protocols, such as sushiswap, we use `addLiquidity`, `removeLiquidity`, `stake`, and `unstake`, and `harvestRewards`

1. Add USDC/DAI into a Sushiswap liquidity pool

```ts
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

2. Remove USDC/DAI worth of 1 Sushiswap LP from the liquidity pool

```ts
const amountSlpUsdcDai = "1000000000000000000"
const tx = await pool.removeLiquidity(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  "DAI_TOKEN_ADDRESS",
  amountSlpUsdcDai
)
```

3. Approve unlimited amound of SLP USDC-DAI token for staking on Sushiswap

```ts
const tx = await pool.approveStaking(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS",
  ethers.constants.MaxInt256
)
```

4. Stake 1 Sushiswap LP USDC/DAI token

```ts
const amountSlpUsdcDai = "1000000000000000000"
const tx = await pool.stake(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS",
  amountSlpUsdcDai
)
```

5. Unstake 1 Sushiswap LP USDC/DAI token

```ts
const amountSlpUsdcDai = "1000000000000000000"
const tx = await pool.unstake(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS",
  amountSlpUsdcDai
)
```

6. Harvest rewards from staked Sushiswap LP USDC/DAI tokens

```ts
const tx = await pool.harvestRewards(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS"
)
```

#### Balancer

For Balancer, we use `joinBalancerPool`, `exitBalancerPool`, and `harvestBalancerRewards`

1. Add 0.00002 WBTC, 1 USDC and 0.0002 WETH to a WBTC/USDC/WETH Balancer pool

```ts
const balancerPoolId = "0x03cd191f589d12b0582a99808cf19851e468e6b500010000000000000000000a"
const assets = [WBTC_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS, WETH_TOKEN_ADDRESS];
const amounts = ["2000", "1000000", "200000000000000"];
const tx = await pool.joinBalancerPool(balancerPoolId, assets, amounts)
```

2. Remove all tokens from WBTC/USDC/WETH Balancer pool

```ts
const amount = await dhedge.utils.getBalance(BALANCER_LP_TOKEN_ADDRESS, pool.address)
const tx = await pool.exitBalancerPool(balancerPoolId, assets, amount)
```

3. Harvest rewards from Balancer

```ts
const tx = await pool.harvestBalancerRewards()
```

#### Uniswap-v3 style

Add liquidity of 100 USDC and 0.00043 WETH to a UniswapV3 pool (here price range is used)

```ts
const tx = await pool.addLiquidityUniswapV3(
  USDC_ADDRESS,
  WETH_ADDRESS,
  '10000000',
  '430000000000000',
  0.0004,
  0.0005,
  null,
  null,
  FeeAmount.MEDIUM,
)
```

#### VelodromeV2 / Ramses

Add liquidity of 100 USDC and 0.00043 WETH to USDC/WETH Ramses pool
(for Velodrome just use Dapp.VELODROMEV2)

```ts
const tx = await pool.addLiquidityV2(
  Dapp.RAMSES,
  USDC_ADDRESS,
  WETH_ADDRESS,
  '10000000',
  '430000000000000',
  false
)
```

<br>

### Lending/Borrowing Aave

---

For Aave, we use `lend`, `withdrawDeposit`, `borrow` and `repay`

##### 1. Deposit 1 USDC into Aave lending pool

```ts
const tx = await pool.lend(Dapp.AAVE, USDC_TOKEN_ADDRESS, "1000000")
```

##### 2. Withdraw 1 USDC from Aave lending pool

```ts
const tx = await pool.withdrawDeposit(Dapp.AAVE, USDC_TOKEN_ADDRESS, "1000000")
```

##### 3. Borrow 0.0001 WETH from Aave lending pool

```ts
const tx = await pool.borrow(Dapp.AAVE, WETH_TOKEN_ADDRESS, "100000000000000");
```

##### 4. Repay 0.0001 WETH to Aave lending pool

```ts
const tx = await pool.repay(Dapp.AAVE, WETH_TOKEN_ADDRESS, "100000000000000");
```
