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

```bash
# npm
npm install @dhedge/v2-sdk

# yarn
yarn add @dhedge/v2-sdk
```

## Quick Start

```ts
import { Dhedge, Dapp, Network, ethers } from "@dhedge/v2-sdk";

// 1. Connect a wallet
const provider = new ethers.providers.JsonRpcProvider("YOUR_RPC_URL");
const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
const dhedge = new Dhedge(wallet, Network.POLYGON);

// 2. Load an existing vault and check its composition
const vault = await dhedge.loadPool("VAULT_ADDRESS");
const composition = await vault.getComposition();

// 3. Deposit USDC into the vault
await vault.approveDeposit("USDC_ADDRESS", ethers.constants.MaxUint256);
await vault.deposit("USDC_ADDRESS", "1000000"); // 1 USDC (6 decimals)

// 4. Trade USDC → WETH on Sushiswap (no API key needed)
await vault.approve(Dapp.SUSHISWAP, "USDC_ADDRESS", ethers.constants.MaxUint256);
await vault.trade(Dapp.SUSHISWAP, "USDC_ADDRESS", "WETH_ADDRESS", "1000000", 0.5);
```

> For aggregator-backed trades (1Inch, Odos), you'll need API keys — see [Initial Setup](#initial-setup).

## Usage

### Table of Contents

  <ol>
    <li>
      <a href="#initial-setup">Initial setup</a>
    </li>
      <li>
        <a href="#general-vault-management">General Vault Management</a>
        <ul>
          <li><a href="#1-create-a-vault">Create a vault</a></li>
          <li><a href="#2-load-a-vault">Load a vault</a></li>
          <li><a href="#3-get-vault-composition">Get vault composition</a></li>
          <li><a href="#4-change-vault-assets-enabledisable">Change vault assets</a></li>
          <li><a href="#5-set-trader">Set trader</a></li>
          <li><a href="#6-approve-asset-for-deposit">Approve asset for deposit</a></li>
          <li><a href="#7-deposit-asset-into-a-vault">Deposit asset into a vault</a></li>
          <li><a href="#8-withdraw-from-a-vault">Withdraw from a vault</a></li>
          <li><a href="#9-approve-vault-asset-for-trading--staking)">Approve vault asset for trading & staking</a></li>
          <li><a href="#10-trade-vault-assets">Trade vault assets</a></li>
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
              <a href="#velodromev2--ramses">VelodromeV2 / Ramses / Aerodrome</a>
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

If you want to use aggregators such as 1Inch or Odos, copy `.env.example` to `.env` and configure the API keys you need.

```
ONEINCH_API_KEY=YOUR_API_KEY_FROM_1INCH
ODOS_API_KEY=YOUR_ODOS_API_KEY
```

- `ONEINCH_API_KEY` is required for `Dapp.ONEINCH`
- `ODOS_API_KEY` is required for `Dapp.ODOS`
- `ODOS_API_KEY` can also be required by `completeTorosWithdrawal(...)` when a Toros withdrawal needs Odos-backed swap data

To get started:

- get a 1inch API key from the [1inch Developer Portal](https://docs.1inch.io/docs/aggregation-protocol/introduction)
- get an Odos API key via the [Odos developer docs](https://docs.odos.xyz/build/api-docs), and make sure it is valid for the Odos endpoint configured by this SDK
- place the keys in a `.env` file at the project root before calling aggregator-backed methods
- if a required key is missing, the SDK will fail before transaction submission

Initialize the sdk with an [ethers wallet](https://docs.ethers.io/v5/api/signer/#Wallet) and the network.

```ts
import { Dhedge, Dapp, Network, ethers } from "@dhedge/v2-sdk";

const privateKey = "YOUR_PRIVATE_KEY";
const providerUrl = "https://polygon-mainnet.infura.io/v3/{YOUR_PROJECT_ID}"

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const walletWithProvider = new ethers.Wallet(privateKey, provider);

const dhedge = new Dhedge(walletWithProvider, Network.POLYGON);
```

In dHEDGE product language these are usually called vaults. In the SDK and smart contracts, many classes and methods still use the older `pool` naming, so both terms may appear in the code examples below.

Important notes:

- `Dhedge` expects a provider-connected `ethers.Wallet`. Read-only providers are not enough for state-changing calls.
- The wallet you pass in is the account that signs transactions. In most cases this is the pool manager wallet.
- `loadPool(address)` assumes the address is a dHEDGE pool and resolves the manager contract automatically.
- `loadPool(address, false)` can be used when you want to work with a non-dHEDGE contract that should execute directly from the signer.

#### Execution model

By default, manager actions are executed through `pool.poolLogic.execTransaction(...)`.

If you set a separate trader account with `pool.setTrader(...)`, you can estimate or send transactions from the trader wallet by using `sdkOptions.useTraderAddressAsFrom`.

```ts
const tx = await pool.trade(
  Dapp.ONEINCH,
  "USDC_TOKEN_ADDRESS",
  "WETH_TOKEN_ADDRESS",
  "1000000",
  0.5,
  null,
  {
    estimateGas: true,
    useTraderAddressAsFrom: true,
  }
)
```

#### Simulation and tx data

Most manager methods accept `sdkOptions` as the last argument.

- `true` is shorthand for `{ estimateGas: true }`
- `{ estimateGas: true }` returns `{ gas, gasEstimationError, to, txData, minAmountOut }`
- `{ onlyGetTxData: true }` returns `{ to, txData, minAmountOut }` without sending a transaction

```ts
const result = await pool.trade(
  Dapp.ONEINCH,
  "USDC_TOKEN_ADDRESS",
  "WETH_TOKEN_ADDRESS",
  "1000000",
  0.5,
  null,
  { estimateGas: true }
)

if (result.gasEstimationError) {
  console.error(result.gasEstimationError)
}
```

<br>

### General Vault Management

---

#### 1. Create a vault

USDC and DAI enabled assets, but only USDC available for deposit.

```ts
const usdcTokenAddress = "USDC_TOKEN_ADDRESS"
const daiTokenAddress = "DAI_TOKEN_ADDRESS"
const vault = await dhedge.createPool(
  "Day Ralio",
  "Awesome Fund",
  "DRAF",
  [
    [usdcTokenAddress, true],
    [daiTokenAddress, false],
  ],
  10
)
console.log("created vault with address", vault.address)
```

#### 2. Load a vault

```ts
const vaultAddress = "YOUR_VAULT_ADDRESS"
const vault = await dhedge.loadPool(vaultAddress)
```

Validate a vault address before loading it:

```ts
const isValidVault = await dhedge.validatePool(vaultAddress)
if (!isValidVault) throw new Error("invalid dHEDGE vault address")
```

#### 3. Get vault composition

```ts
const composition = await vault.getComposition();
```

`getComposition()` returns raw on-chain values:

```ts
[
  {
    asset: "0x...",
    isDeposit: true,
    balance: BigNumber,
    rate: BigNumber,
  }
]
```

You will usually need to fetch token decimals and symbols separately before displaying vault holdings to users.

#### 4. Change vault assets (enable/disable)

Change pool assets to allow DAI for deposits. Also enable WETH as an asset, but shouldn't be allowed as deposit.

```ts
const enabledAssets = [
  { asset: "USDC_TOKEN_ADDRESS", isDeposit: true },
  { asset: "DAI_TOKEN_ADDRESS", isDeposit: true },
  { asset: "WETH_TOKEN_ADDRESS", isDeposit: false },
]
const tx = await vault.changeAssets(enabledAssets)
```

#### 5. Set trader

Set an account with trading permissions

```ts
const tx = await vault.setTrader("TRADER_ACCOUNT_ADDRESS")
```

#### 6. Approve asset for deposit

Before depositing an asset into a vault, the user wallet must approve the vault to transfer that asset.

Approve unlimited amount of USDC to deposit into a vault.

```ts
const tx = await vault.approveDeposit("USDC_TOKEN_ADDRESS", ethers.constants.MaxUint256);
```

#### 7. Deposit asset into a vault

Deposit 1 USDC into a vault

```ts
const usdcDepositAmount = "100000"
const tx = await vault.deposit("USDC_TOKEN_ADDRESS", usdcDepositAmount);
```

#### 8. Withdraw from a vault

Withdraw 1.00002975 vault tokens. Note that this cannot be called if set as Trader account

```ts
const poolTokensWithdrawAmount = "1000029750000000000"
const tx = await vault.withdraw(poolTokensWithdrawAmount);
```

#### 9. Approve vault asset for trading & staking

Before the vault can trade or stake an asset on an external protocol, the vault must approve that protocol router or staking contract.

Approve unlimited amount of USDC to trade on Sushiswap

```ts
const tx = await vault.approve(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  ethers.constants.MaxInt256
)
```

Approval model summary:

- `approveDeposit(asset, amount)` approves from the user wallet to the vault
- `approve(dapp, asset, amount)` approves from the vault to a protocol router
- `approveStaking(dapp, asset, amount)` approves from the vault to a staking contract
- `approveSpender(spender, asset, amount)` is available for custom integrations

#### 10. Trade vault assets

Trade 1 USDC into DAI on Sushiswap (other options depend on network and configured API keys, and can include TOROS, QUICKSWAP, BALANCER, ONEINCH, and ODOS)

```ts
const amountIn = "1000000"
const slippage = 0.5
const tx = await vault.trade(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  "DAI_TOKEN_ADDRESS",
  amountIn,
  slippage
)
```

#### Toros mint flow

Minting a Toros token uses `vault.trade(...)`, but it is not a generic token-to-token swap. The input asset must be a valid deposit asset for the underlying Toros vault.

```ts
await vault.approve(
  Dapp.TOROS,
  "USDC_TOKEN_ADDRESS",
  ethers.constants.MaxUint256
)

const tx = await vault.trade(
  Dapp.TOROS,
  "USDC_TOKEN_ADDRESS",
  "TOROS_TOKEN_ADDRESS",
  "100000000",
  slippage
)
```

#### Toros redeem flow

Redeeming a Toros token has more prerequisites than a normal trade:

- newly minted Toros or dHEDGE vault tokens may be subject to a cooldown before redemption can be initiated
- while that cooldown is active, redemption cannot be initiated
- before initiating redemption, the vault must approve the Toros token for the Toros router
- after redemption is initiated, some Toros withdrawals require a second completion step
- `completeTorosWithdrawal(...)` can require `ODOS_API_KEY` when Odos-backed swap data is needed

1. Approve the Toros token for redemption:

```ts
await vault.approve(
  Dapp.TOROS,
  "TOROS_TOKEN_ADDRESS",
  ethers.constants.MaxUint256
)
```

2. Initiate the redemption:

```ts
const tx = await vault.trade(
  Dapp.TOROS,
  "TOROS_TOKEN_ADDRESS",
  "USDC_TOKEN_ADDRESS",
  "100000000",
  slippage
)
```

3. Complete the withdrawal when required by the product flow:

```ts
const tx = await vault.completeTorosWithdrawal(
  "USDC_TOKEN_ADDRESS",
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

For Arrakis, we use `increaseLiquidity` to stake or increase lp, and `decreaseLiquidity`, and `claimFees`. see example in the [arrakis test](https://github.com/dhedge/dhedge-v2-sdk/blob/master/src/test/arrakis.test.ts)

---

For Uniswap v3, we use `approveUniswapV3Liquidity`, `addLiquidityUniswapV3`, `decreaseLiquidity`, `increaseLiquidity`, and `claimFees`.

1. Add liquidity of 100 USDC and 0.00043 WETH to a UniswapV3 pool (here price range is used)

```ts

await pool.approveUniswapV3Liquidity(
  USDC_ADDRESS,
  ethers.constants.MaxInt256
);
await pool.approveUniswapV3Liquidity(
  WETH_ADDRESS,
  ethers.constants.MaxInt256
);
const tx = await pool.addLiquidityUniswapV3(
  Dapp.UNISWAPV3,
  WETH_ADDRESS,
  USDC_ADDRESS,
  '430000000000000', // wethBalance
  '100000000',       // usdcBalance
  2000,              // minPrice
  3000,              // maxPrice
  null,              // minTick (use null when providing prices)
  null,              // maxTick (use null when providing prices)
  FeeAmount.MEDIUM,
)
```

2. Remove 50% liquidity from the existing pool

```ts
tokenId = await nonfungiblePositionManager.tokenOfOwnerByIndex(pool.address,0).toString();
const tx = await pool.decreaseLiquidity(
  Dapp.UNISWAPV3,
  tokenId,
  50 // precent
);
```

Removing 100% will burn the NFT position.
Burning a Ramses CL NFT position won't claim rewards, so `getRewards` needs to be called before.

3. Increase liquidity in the existing WETH/USDC pool

```ts
const result = await pool.increaseLiquidity(
  Dapp.UNISWAPV3,
  tokenId,
  new BigNumber(3000).times(1e6).toFixed(0), // usdc
  new BigNumber(1).times(1e18).toFixed(0) // eth
);
```

4. Claim fees

```ts
const tx = await pool.claimFees(Dapp.UNISWAPV3, tokenId);
```

4. Claim rewards (e.g. for Ramses CL)

```ts
const tx = await pool.getRewards(Dapp.RAMSESCL, tokenId, [RAM_ADDRESS]);
```

#### VelodromeV2 / Ramses / Aerodrome

For VelodromeV2 / Ramses / Aerodrome , we use `addLiquidityV2`, `stakeInGauge`, `unstakeFromGauge`, `removeLiquidityV2`, and `claimFees`.

Add liquidity of 100 USDC and 0.00043 WETH to USDC/WETH Ramses pool
(for Velodrome just use Dapp.VELODROMEV2, for Aerodrome Dapp.AERODROME). see example in the [arrakis test](https://github.com/dhedge/dhedge-v2-sdk/blob/master/src/test/ramses.test.ts), [velodromeV2 test](https://github.com/dhedge/dhedge-v2-sdk/blob/master/src/test/velodromeV2.test.ts) and [aerdodrome test](https://github.com/dhedge/dhedge-v2-sdk/blob/master/src/test/aerdodrome.test.ts)

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

<br>

### The Flat Money Protocol

---

##### 1. Minting UNIT : deposit 1 rETH to mint UNIT

```ts
      const depositAmount = new BigNumber(1).times(1e18).toString();
      const tx = await pool.mintUnitViaFlatMoney(
        depositAmount,
        0.5,  // slippage, 0.5%
        5,  // maxKeeperFeeInUsd, $5
      );
```

##### 2. Redeeming UNIT : Redeem 1 UNIT for rETH

```ts
      const withdrawAmount = new BigNumber(1).times(1e18).toString();
      const tx = await pool.redeemUnitViaFlatMoney(
        withdrawAmount,
        0.5,  // slippage, 0.5%
        5, // maxKeeperFeeInUsd, $5
      );
```

##### 3. Cancel announced order

```ts
      await pool.cancelOrderViaFlatMoney();
```
