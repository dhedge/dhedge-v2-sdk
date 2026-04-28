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

// 4. Trade USDC → WETH on KyberSwap (no API key needed)
await vault.approve(Dapp.KYBERSWAP, "USDC_ADDRESS", ethers.constants.MaxUint256);
await vault.trade(Dapp.KYBERSWAP, "USDC_ADDRESS", "WETH_ADDRESS", "1000000", 0.5);
```

> For aggregator-backed trades (1Inch, Odos), you'll need API keys — see [Initial Setup](#initial-setup).

## Usage

### Table of Contents

  <ol>
    <li>
      <a href="#initial-setup">Initial setup</a>
      <ul>
        <li><a href="#supported-networks">Supported networks</a></li>
        <li><a href="#looking-up-addresses">Looking up addresses</a></li>
        <li><a href="#common-revert-reasons">Common revert reasons</a></li>
        <li><a href="#reference-tests-as-live-examples">Reference: tests as live examples</a></li>
        <li><a href="#execution-model">Execution model</a></li>
        <li><a href="#simulation-and-tx-data">Simulation and tx data</a></li>
      </ul>
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
          <li><a href="#9-approve-vault-asset-for-trading--staking">Approve vault asset for trading & staking</a></li>
          <li><a href="#10-trade-vault-assets">Trade vault assets</a></li>
          <li><a href="#toros-mint-flow">Toros mint flow</a></li>
          <li><a href="#toros-redeem-flow">Toros redeem flow</a></li>
          <li><a href="#toros-limit-orders">Toros limit orders</a></li>
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
              <a href="#velodromecl--aerodromecl--pancakecl">VelodromeCL / AerodromeCL / PancakeCL</a>
            </li>
            <li>
              <a href="#velodromev2--aerodrome">VelodromeV2 / Aerodrome</a>
            </li>
            <li>
              <a href="#pendle">Pendle</a>
            </li>
        </ul>
    </li>
    <li>
      <a href="#lendingborrowing-aave">Lending/Borrowing Aave</a>
    </li>
    <li>
      <a href="#lending-compoundv3--fluid">Lending CompoundV3 / Fluid</a>
    </li>
    <li>
      <a href="#the-flat-money-protocol">The Flat Money Protocol</a>
    </li>
    <li>
      <a href="#development">Development</a>
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

#### Supported networks

The SDK supports six networks: **Polygon**, **Optimism**, **Arbitrum**, **Base**, **Ethereum**, **Hyperliquid**. The most broadly-deployed protocols across these networks are **1inch**, **KyberSwap**, **Aave V3**, **Toros**, and **Toros LimitOrder**. The authoritative per-(network, Dapp) registry is `routerAddress` in `src/config.ts` — a Dapp is supported on a network iff `routerAddress[network][dapp]` is set. CL position managers, gauges, FlatMoney, and limit orders use parallel maps in the same file (`nonfungiblePositionManagerAddress`, `stakingAddress`, `flatMoneyContractAddresses`, `limitOrderAddress`).

#### Looking up addresses

Most code examples use placeholders like `"USDC_TOKEN_ADDRESS"`, `MARKET_ADDRESS`, or `BALANCER_LP_TOKEN_ADDRESS`. The single source of truth for what's deployed and whitelisted on each network is the **dHEDGE [V2-Public config directory](https://github.com/dhedge/V2-Public/tree/master/config)**.

What each file gives you:

- **`dHEDGE Assets list.json`** — every registered asset/contract: `assetName`, `assetAddress`, `assetType`, oracle config. Filter by `assetName` (e.g. `WBTC`, `USDC Native`, `Toros BTCBULL3X`, `cWETHv3`, `Fluid USDC`, `PT-wstETH-25JUN2026`) to get its address.
- **`dHEDGE Governance Contract Guards.csv`** — **active** contract guards: which protocols vaults are currently allowed to call (Aave, Pendle, Velodrome routers, Toros LimitOrderManager, etc.).
- **`dHEDGE Deprecated Contract Guards.csv`** — **deprecated** contract guards: protocols that used to be allowed but no longer are. Useful when a previously-working address starts reverting.
- **`dHEDGE Governance Asset Guards.csv`** — per-asset-type rules (which asset types vaults can hold).

Per-network direct links (raw URLs are agent-friendly — fetch them directly):

| Network | Folder | Assets | Active guards | Deprecated | Asset guards |
| --- | --- | --- | --- | --- | --- |
| Polygon | [folder](https://github.com/dhedge/V2-Public/tree/master/config/polygonProd) | [json](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/polygonProd/dHEDGE%20Assets%20list%20-%20Polygon.json) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/polygonProd/dHEDGE%20Governance%20Contract%20Guards%20-%20Polygon.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/polygonProd/dHEDGE%20Deprecated%20Contract%20Guards%20-%20Polygon.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/polygonProd/dHEDGE%20Governance%20Asset%20Guards%20-%20Polygon.csv) |
| Optimism | [folder](https://github.com/dhedge/V2-Public/tree/master/config/ovm) | [json](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/ovm/dHEDGE%20Assets%20list.json) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/ovm/dHEDGE%20Governance%20Contract%20Guards.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/ovm/dHEDGE%20Deprecated%20Contract%20Guards.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/ovm/dHEDGE%20Governance%20Asset%20Guards.csv) |
| Arbitrum | [folder](https://github.com/dhedge/V2-Public/tree/master/config/arbitrum) | [json](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/arbitrum/dHEDGE%20Assets%20list.json) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/arbitrum/dHEDGE%20Governance%20Contract%20Guards.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/arbitrum/dHEDGE%20Deprecated%20Contract%20Guards.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/arbitrum/dHEDGE%20Governance%20Asset%20Guards.csv) |
| Base | [folder](https://github.com/dhedge/V2-Public/tree/master/config/base) | [json](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/base/dHEDGE%20Assets%20list.json) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/base/dHEDGE%20Governance%20Contract%20Guards.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/base/dHEDGE%20Deprecated%20Contract%20Guards.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/base/dHEDGE%20Governance%20Asset%20Guards.csv) |
| Ethereum | [folder](https://github.com/dhedge/V2-Public/tree/master/config/ethereum) | [json](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/ethereum/dHEDGE%20Assets%20list.json) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/ethereum/dHEDGE%20Governance%20Contract%20Guards.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/ethereum/dHEDGE%20Deprecated%20Contract%20Guards.csv) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/ethereum/dHEDGE%20Governance%20Asset%20Guards.csv) |
| Hyperliquid | [folder](https://github.com/dhedge/V2-Public/tree/master/config/hyperevm) | [json](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/hyperevm/dHEDGE%20Assets%20list.json) | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/hyperevm/dHEDGE%20Governance%20Contract%20Guards.csv) | n/a | [csv](https://raw.githubusercontent.com/dhedge/V2-Public/master/config/hyperevm/dHEDGE%20Governance%20Asset%20Guards.csv) |

Router addresses (for `pool.approve(dapp, ...)`) live in `src/config.ts` → `routerAddress[network][dapp]`.

#### Common revert reasons

Two canonical references in [dhedge/V2-Public](https://github.com/dhedge/V2-Public/tree/master/readmes/errorCodes):

- [`dHEDGEV2ErrorCodes.json`](https://raw.githubusercontent.com/dhedge/V2-Public/master/readmes/errorCodes/dHEDGEV2ErrorCodes.json) — every `dhN` string thrown by dHEDGE contracts (e.g. `dh22`, `dh4`), with a description and recommended action. Fetch the JSON and look up `result["dh22"]`.
- [`4byteErrorCodes.md`](https://raw.githubusercontent.com/dhedge/V2-Public/master/readmes/errorCodes/4byteErrorCodes.md) — protocol-specific 4-byte custom-error selectors (DYTM, etc.) mapped to their source contracts.

For 4-byte selectors not in the file above, decode them with `cast 4byte 0x<selector>` (Foundry).

#### Reference: tests as live examples

Each protocol section below has a matching test under `src/test/`. The tests are the most up-to-date reference for the SDK's **call patterns** — they show the actual sequence of SDK methods (approve → trade, addLiquidity → stake, etc.) for each integration.

When reading a test as a reference, focus on the SDK calls themselves and ignore the test-only scaffolding (manager impersonation, asset funding via `setUSDCAmount` / `setTokenAmount`, oracle staleness fixes, fork RPC plumbing) — those exist because tests run against a Hardhat fork. A real vault manager calling the SDK from production code already _is_ the manager, holds the assets, and uses live RPC, so the only transferable part is the SDK invocation sequence.

Naming convention:
- `src/test/<protocol>.test.ts` — runs against a Hardhat fork.
- `src/test/<protocol>.onchain.test.ts` — requires a live RPC (used when a fork can't reproduce the path: CowSwap solver settlement, Hyperliquid CoreWriter, Toros `completeWithdrawal` aggregator quotes).

#### Execution model

By default, manager actions are executed through `pool.poolLogic.execTransaction(...)`.

If you set a separate trader account with `pool.setTrader(...)`, you can estimate or send transactions from the trader wallet by using `sdkOptions.useTraderAddressAsFrom`.

```ts
const tx = await pool.trade(
  Dapp.ONEINCH,
  "USDC_TOKEN_ADDRESS",
  "WETH_TOKEN_ADDRESS",
  "1000000",   // 1 USDC (6 decimals)
  0.5,         // slippage %
  null,
  {
    estimateGas: true,
    useTraderAddressAsFrom: true,
  }
)
```

#### Simulation and tx data

Most manager methods accept `sdkOptions` as the last argument. The return shape depends on which flag you set:

- **No flag (default)** — sends the transaction and returns the underlying ethers `ContractTransaction` / `TransactionResponse`.
- **`true`** — shorthand for `{ estimateGas: true }`.
- **`{ estimateGas: true }`** — simulates and returns `{ gas, gasEstimationError, to, txData, minAmountOut }`. `gas` is `null` when `gasEstimationError` is set.
- **`{ onlyGetTxData: true }`** — returns `{ to, txData, minAmountOut }` (no `gas` / `gasEstimationError`) without sending or simulating.

> `minAmountOut` is only populated by `pool.trade(...)` for the swap aggregators that fetch a quote from an external API: `Dapp.ONEINCH`, `Dapp.ODOS`, `Dapp.KYBERSWAP`, and `Dapp.PENDLE`. For all other Dapps and for non-trade methods (`approve`, `lend`, `addLiquidity*`, etc.) it is `null` — either the slippage limit is encoded inside the calldata at execution time, or the operation has no concept of a min-out. `Dapp.COWSWAP` rejects `estimateGas` and `onlyGetTxData` entirely.

```ts
const result = await pool.trade(
  Dapp.ONEINCH,
  "USDC_TOKEN_ADDRESS",
  "WETH_TOKEN_ADDRESS",
  "1000000",   // 1 USDC (6 decimals)
  0.5,         // slippage %
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
const usdcDepositAmount = "1000000" // 1 USDC (6 decimals)
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

Approve unlimited amount of USDC to trade on KyberSwap

```ts
const tx = await vault.approve(
  Dapp.KYBERSWAP,
  "USDC_TOKEN_ADDRESS",
  ethers.constants.MaxInt256
)
```

Approval model summary:

| Method | From → To | Spender resolution | When to use |
| --- | --- | --- | --- |
| `approveDeposit(asset, amount)` | user wallet → vault | the vault itself | Before `vault.deposit(asset, amount)` |
| `approve(dapp, asset, amount)` | vault → protocol router | `routerAddress[network][dapp]` | Before `vault.trade`, `vault.lend`, `vault.borrow`, etc. |
| `approveStaking(dapp, asset, amount)` | vault → staking contract | `stakingAddress[network][dapp]` | Before `vault.stake(dapp, ...)` (V2-style farms) |
| `approveSpender(spender, asset, amount)` | vault → arbitrary spender | caller-supplied | Custom integrations, CL position managers, etc. |
| `approveSpenderNFT(spender, nftContract, tokenId)` | vault → arbitrary spender (ERC-721) | caller-supplied | Approving a single CL position NFT before `stakeInGauge` |

#### 10. Trade vault assets

Trade 1 USDC into DAI on KyberSwap. Other `Dapp` values supported by `vault.trade(...)` depend on the network — they include `TOROS`, `BALANCER`, `ONEINCH` (requires `ONEINCH_API_KEY`), `ODOS` (requires `ODOS_API_KEY`), `PENDLE`, and `COWSWAP`.

```ts
const amountIn = "1000000" // 1 USDC (6 decimals)
const slippage = 0.5
const tx = await vault.trade(
  Dapp.KYBERSWAP,
  "USDC_TOKEN_ADDRESS",
  "DAI_TOKEN_ADDRESS",
  amountIn,
  slippage
)
```

**CowSwap** behaves differently from the other aggregators:

- Approve the **CoW Vault Relayer** (`0xC92E8bdf79f0507f65a392b0ab4667716BFE0110`) via `approveSpender`, not via `approve(Dapp.COWSWAP, ...)`.
- A single `vault.trade(Dapp.COWSWAP, ...)` call internally sends **two transactions** (submit the signed order, then `setPreSignature` on GPv2Settlement). The order is filled off-chain by solvers.
- `estimateGas` and `onlyGetTxData` are not supported.

```ts
await vault.approveSpender(
  "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110", // CoW Vault Relayer
  "USDC_TOKEN_ADDRESS",
  ethers.constants.MaxUint256
);

await vault.trade(
  Dapp.COWSWAP,
  "USDC_TOKEN_ADDRESS",
  "WETH_TOKEN_ADDRESS",
  "2000000",
  0.5
);
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
  "100000000", // 100 USDC (6 decimals)
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
  "100000000", // amount of Toros vault tokens to redeem (Toros tokens are 18 decimals)
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

#### Toros limit orders

Toros vaults support stop-loss / take-profit orders managed by the on-chain `PoolLimitOrderManager`. From a dHEDGE vault, the manager (or trader) can register an order against a held Toros vault token; once the pricing-asset price crosses one of the thresholds the order becomes executable.

A vault may hold at most one active limit order per Toros vault token. Prices are passed in 18-decimal fixed point (D18). Pass `null`/`undefined` to disable a side — stop-loss defaults to `0` (off) and take-profit defaults to `MaxUint256` (off).

The `pricingAsset` must match the address of an asset registered in the dHEDGE asset handler. Pick the entry in `dHEDGE Assets list.json` whose `assetName` represents the Toros vault's price reference (e.g. `WBTC` for BTC vaults, `WETH` for ETH vaults) and use its `assetAddress`. See [Looking up addresses](#looking-up-addresses) for the per-network URLs.

1. Approve the Toros vault token for the limit-order manager (one-time)

```ts
import { ethers } from "ethers";

await vault.approveTorosLimitOrder(
  "TOROS_VAULT_ADDRESS",
  ethers.constants.MaxUint256
);
```

2. Create an order — stop-loss at \$50,000 and take-profit at \$100,000 priced in WBTC

```ts
await vault.createTorosLimitOrder(
  "TOROS_VAULT_ADDRESS",
  ethers.utils.parseEther("0.001"),       // amount of vault tokens (18 decimals)
  ethers.utils.parseEther("50000"),       // stopLossPriceD18
  ethers.utils.parseEther("100000"),      // takeProfitPriceD18
  "WBTC_TOKEN_ADDRESS"                    // pricingAsset (assetAddress from dHEDGE Assets list.json)
);
```

3. Read the active order, modify it, or delete it

```ts
const order = await vault.getTorosLimitOrder(vault.address, "TOROS_VAULT_ADDRESS");
const exists = await vault.hasActiveTorosLimitOrder(vault.address, "TOROS_VAULT_ADDRESS");

await vault.modifyTorosLimitOrder(
  "TOROS_VAULT_ADDRESS",
  order.amount,
  order.stopLossPriceD18.mul(95).div(100), // tighten stop by 5%
  order.takeProfitPriceD18,
  order.pricingAsset
);

await vault.deleteTorosLimitOrder("TOROS_VAULT_ADDRESS");
```

### Liquidity

---

#### Uniswap-v2 style

> **Note:** This path is **legacy**. Sushiswap is the only V2-style DEX still configured (Polygon only) and is not actively used; new integrations should prefer KyberSwap / 1inch / Pendle / Velodrome. The methods below remain for backwards compatibility.

For Uniswap-v2 like protocols, such as sushiswap, we use `addLiquidity`, `removeLiquidity`, `stake`, and `unstake`, and `harvestRewards`

1. Add USDC/DAI into a Sushiswap liquidity pool

```ts
const amountUsdc = "1000000"          // 1 USDC (6 decimals)
const amountDai = "997085000000000000" // ~0.997 DAI (18 decimals)
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
const amountSlpUsdcDai = "1000000000000000000" // 1 LP token (18 decimals)
const tx = await pool.removeLiquidity(
  Dapp.SUSHISWAP,
  "USDC_TOKEN_ADDRESS",
  "DAI_TOKEN_ADDRESS",
  amountSlpUsdcDai
)
```

3. Approve unlimited amount of SLP USDC-DAI token for staking on Sushiswap

```ts
const tx = await pool.approveStaking(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS",
  ethers.constants.MaxInt256
)
```

4. Stake 1 Sushiswap LP USDC/DAI token

```ts
const amountSlpUsdcDai = "1000000000000000000" // 1 LP token (18 decimals)
const tx = await pool.stake(
  Dapp.SUSHISWAP,
  "SLP_USDC_DAI_TOKEN_ADDRESS",
  amountSlpUsdcDai
)
```

5. Unstake 1 Sushiswap LP USDC/DAI token

```ts
const amountSlpUsdcDai = "1000000000000000000" // 1 LP token (18 decimals)
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
const amounts = [
  "2000",            // 0.00002 WBTC (8 decimals)
  "1000000",         // 1 USDC (6 decimals)
  "200000000000000"  // 0.0002 WETH (18 decimals)
];
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
  50 // percent
);
```

Removing 100% will burn the NFT position.

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

#### VelodromeCL / AerodromeCL / PancakeCL

Velodrome CL, Aerodrome CL, and Pancake CL use the same SDK methods as Uniswap V3 — `approveUniswapV3Liquidity`, `addLiquidityUniswapV3`, `increaseLiquidity`, `decreaseLiquidity`, `claimFees` — just pass the matching `Dapp` enum (`Dapp.VELODROMECL`, `Dapp.AERODROMECL`, or `Dapp.PANCAKECL`). Use `minTick` / `maxTick` (not `minPrice` / `maxPrice`) and pass the pool's tick spacing as the last argument instead of a Uniswap fee tier.

1. Mint a position (USDC/WETH on Aerodrome CL)

```ts
await pool.approveSpender(AERODROME_POSITION_MANAGER, USDC_ADDRESS, ethers.constants.MaxUint256);
await pool.approveSpender(AERODROME_POSITION_MANAGER, WETH_ADDRESS, ethers.constants.MaxUint256);

await pool.addLiquidityUniswapV3(
  Dapp.AERODROMECL,
  USDC_ADDRESS,
  WETH_ADDRESS,
  usdcAmount,
  wethAmount,
  null,        // minPrice (use ticks instead)
  null,        // maxPrice
  -2,          // minTick
  4,           // maxTick
  1            // tick spacing
);
```

`AERODROME_POSITION_MANAGER` is the chain's CL `nonfungiblePositionManager`; look it up via `nonfungiblePositionManagerAddress[network][Dapp.AERODROMECL]` from `src/config.ts`.

2. Stake the CL position in a gauge (then unstake later)

```ts
await pool.approveSpenderNFT(GAUGE_ADDRESS, AERODROME_POSITION_MANAGER, tokenId);
await pool.stakeInGauge(Dapp.AERODROMECL, GAUGE_ADDRESS, tokenId);

// later
await pool.unstakeFromGauge(GAUGE_ADDRESS, tokenId);
```

`claimFees(Dapp.AERODROMECL, tokenId)` collects swap fees on an unstaked position and gauge rewards (e.g. AERO/VELO) on a staked position.

#### VelodromeV2 / Aerodrome

For VelodromeV2 / Aerodrome, we use `addLiquidityV2`, `stakeInGauge`, `unstakeFromGauge`, `removeLiquidityV2`, and `claimFees`.

Add liquidity of 100 USDC and 0.00043 WETH to a USDC/WETH pool
(for Velodrome use `Dapp.VELODROMEV2`, for Aerodrome use `Dapp.AERODROME`). See examples in the [velodromeV2 test](https://github.com/dhedge/dhedge-v2-sdk/blob/master/src/test/velodromeV2.test.ts) and [aerodrome test](https://github.com/dhedge/dhedge-v2-sdk/blob/master/src/test/aerodrome.test.ts).

```ts
const tx = await pool.addLiquidityV2(
  Dapp.VELODROMEV2,
  USDC_ADDRESS,
  WETH_ADDRESS,
  '10000000',
  '430000000000000',
  false
)
```

#### Pendle

For Pendle Principal Tokens (PT), we use `pool.trade(Dapp.PENDLE, ...)` to swap an underlying token into a PT, swap a PT back into its underlying, or — once the market has expired — redeem a PT to its underlying via the SY exchange rate. The SDK auto-detects expired markets via the Pendle API and routes the call through the matured-exit path.

> **Note:** Only a limited set of PTs is supported. Each PT (and its underlying / SY) must be whitelisted in the dHEDGE asset handler before a vault can hold or trade it. Check the live asset registry (see [Looking up addresses](#looking-up-addresses)) for the current list — attempts to trade an unwhitelisted PT will revert.

1. Swap underlying (e.g. wstETH) into a PT in an active market

```ts
const wstEthBalance = await vault.utils.getBalance(WSTETH_ADDRESS, vault.address);
await vault.approve(Dapp.PENDLE, WSTETH_ADDRESS, ethers.constants.MaxUint256);
await vault.trade(
  Dapp.PENDLE,
  WSTETH_ADDRESS,
  PT_WSTETH_ADDRESS,
  wstEthBalance,
  1 // slippage %
);
```

2. Swap a PT back into its underlying before maturity

```ts
const ptBalance = await vault.utils.getBalance(PT_WSTETH_ADDRESS, vault.address);
await vault.approve(Dapp.PENDLE, PT_WSTETH_ADDRESS, ethers.constants.MaxUint256);
await vault.trade(
  Dapp.PENDLE,
  PT_WSTETH_ADDRESS,
  WSTETH_ADDRESS,
  ptBalance,
  1
);
```

3. Redeem a matured PT to its underlying

After the market's `expiry`, the SDK detects the inactive market and uses the `exitPostExpToToken` path; the amount received is `ptAmount * 1e18 / SY.exchangeRate()`.

```ts
const ptBalance = await vault.utils.getBalance(MATURED_PT_ADDRESS, vault.address);
await vault.approve(Dapp.PENDLE, MATURED_PT_ADDRESS, ethers.constants.MaxUint256);
await vault.trade(
  Dapp.PENDLE,
  MATURED_PT_ADDRESS,
  UNDERLYING_ADDRESS,
  ptBalance,
  1
);
```

<br>

### Lending/Borrowing Aave

---

For Aave, we use `lend`, `withdrawDeposit`, `borrow` and `repay`

##### 1. Deposit 1 USDC into Aave lending pool

```ts
const tx = await pool.lend(Dapp.AAVE, USDC_TOKEN_ADDRESS, "1000000") // 1 USDC (6 decimals)
```

##### 2. Withdraw 1 USDC from Aave lending pool

```ts
const tx = await pool.withdrawDeposit(Dapp.AAVE, USDC_TOKEN_ADDRESS, "1000000") // 1 USDC (6 decimals)
```

##### 3. Borrow 0.0001 WETH from Aave lending pool

```ts
const tx = await pool.borrow(Dapp.AAVE, WETH_TOKEN_ADDRESS, "100000000000000"); // 0.0001 WETH (18 decimals)
```

##### 4. Repay 0.0001 WETH to Aave lending pool

```ts
const tx = await pool.repay(Dapp.AAVE, WETH_TOKEN_ADDRESS, "100000000000000"); // 0.0001 WETH (18 decimals)
```

<br>

### Lending CompoundV3 / Fluid

CompoundV3 markets (cTokens, e.g. `cWETHv3`, `cUSDCv3`) and Fluid markets (fTokens, e.g. `fWETH`, `fUSDC`) share the same SDK surface — `lendCompoundV3` to supply and `withdrawCompoundV3` to withdraw, with the market address as the first argument. CompoundV3 additionally exposes `harvestCompoundV3Rewards` to claim COMP rewards (Fluid has no rewards harvest path).

Look up market addresses in `dHEDGE Assets list.json` (see [Looking up addresses](#looking-up-addresses)). Compound V3 markets are `assetType: "28"` with `contractGuard: "CompoundV3CometContractGuard"`; Fluid markets are `assetType: "34"` with `contractGuard: "FluidTokenContractGuard"`.

1. Approve the asset for the market

```ts
await pool.approveSpender(MARKET_ADDRESS, ASSET_ADDRESS, ethers.constants.MaxUint256);
```

2. Supply

```ts
// CompoundV3
await pool.lendCompoundV3(CWETH_V3_ADDRESS, WETH_ADDRESS, "1000000000000000000"); // 1 WETH (18 decimals)

// Fluid uses the same method, just a Fluid market address
await pool.lendCompoundV3(FWETH_ADDRESS, WETH_ADDRESS, "1000000000000000000");
```

3. Withdraw

```ts
await pool.withdrawCompoundV3(MARKET_ADDRESS, ASSET_ADDRESS, AMOUNT);
```

4. (CompoundV3 only) Harvest COMP rewards

```ts
await pool.harvestCompoundV3Rewards(CWETH_V3_ADDRESS);
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

<br>

## Development

### Setup

```sh
# install
yarn install

# copy and edit env
cp .env.example .env
```

`.env` recognised keys:

| Variable | Purpose |
| --- | --- |
| `PRIVATE_KEY` | Wallet used by tests; needs to be the manager (or trader) of `TEST_POOL[network]` for fork tests. |
| `<NETWORK>_URL` | RPC URL used to fork or run on-chain tests. One per network: `POLYGON_URL`, `OPTIMISM_URL`, `ARBITRUM_URL`, `BASE_URL`, `ETHEREUM_URL`, `PLASMA_URL`, `HYPERLIQUID_URL`. |
| `ONEINCH_API_KEY` | Required only for `Dapp.ONEINCH` calls. |

### Build & lint

```sh
yarn build   # tsdx build
yarn lint    # tsdx lint
```

### Fork a network

Each fork command spins up a local Hardhat node on a fixed port (the test wallet helper looks these ports up automatically when `onFork: true`):

| Network | Command | Local port |
| --- | --- | :---: |
| Polygon | `yarn fork:polygon` | 8542 |
| Optimism | `yarn fork:optimism` | 8544 |
| Arbitrum | `yarn fork:arbitrum` | 8540 |
| Base | `yarn fork:base` | 8546 |
| Ethereum | `yarn fork:ethereum` | 8547 |
| Plasma | `yarn fork:plasma` | 8548 |
| Hyperliquid | `yarn fork:hyperliquid` | 8549 |

### Run tests

```sh
yarn test                             # run everything
npx jest src/test/aave.test.ts        # one file
npx jest -t "trades USDC into WETH"   # by test name
```

Most test files declare a network with `testingHelper({ network: Network.X, testingRun, onFork: true })`. The helper picks `http://127.0.0.1:<port>` when `onFork: true` (the matching `yarn fork:<network>` must be running) and `process.env.<NETWORK>_URL` when `onFork: false` — used for "on-chain" tests like `*.onchain.test.ts` that can't run on a fork (e.g. CowSwap solver settlement, Hyperliquid CoreWriter, Toros completeWithdrawal aggregator quotes).
