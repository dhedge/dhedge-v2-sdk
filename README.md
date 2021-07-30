# dHEDGE V2 SDK

🛠 A complete implementation for building applications on top of dHEDGE V2",

**Features:**

- Built with [ethers.js][https://docs.ethers.io/]
- Create and manage V2 pools from background app or your own dApp
- Easy-to-use functions to trade assets, provide liquidity to a liquidity pool or stake assets
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

Initialize the sdk with an [ethers wallet][https://docs.ethers.io/v4/api-wallet.html] and the network.

```
import { Dhedge, Network, ethers } from "@dhedge/v2-sdk";

const privateKey = "0x0123456789012345678901234567890123456789012345678901234567890123";
const providerUrl = "https://polygon-mainnet.infura.io/v3/{your-project-id}"

const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const walletWithProvider = new ethers.Wallet(privateKey, provider);

const dhedge = new Dhedge(walletWithProvider, Network.POLYGON);
```
