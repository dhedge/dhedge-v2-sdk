import { Contract, ethers, Wallet } from "ethers";
import {
  Token,
  TokenAmount,
  Pair,
  TradeType,
  Route,
  Trade,
  Percent
} from "@sushiswap/sdk";
import { SOR, SwapTypes } from "@balancer-labs/sor";
import { BaseProvider } from "@ethersproject/providers";

import IERC20 from "../abi/IERC20.json";
import IMiniChefV2 from "../abi/IMiniChefV2.json";
import UniswapV2Factory from "../abi/IUniswapV2Factory.json";
import UniswapV2Pair from "../abi/IUniswapV2Pair.json";
import IBalancerV2Vault from "../abi/IBalancertV2Vault.json";
import {
  balancerSubgraph,
  dappFactoryAddress,
  networkChainIdMap,
  stakingAddress
} from "../config";
import { Dapp, Network, Reserves } from "../types";
import { Pool } from ".";

export class Utils {
  network: Network;
  signer: Wallet;

  public constructor(network: Network, signer: Wallet) {
    this.network = network;
    this.signer = signer;
  }

  /**
   * Return the reserves of the two assets of a liquidity pool
   * This is the price of one token in the other
   * @param {Dapp} dApp DApp like Uniswap or Sushiswap
   * @param {string} tokenA First token of the pool pair
   * @param {string} tokenB Second token of the pool pair
   * @returns {Promise<Reserves>} Reserves of the assets in BigNumber
   * @throws If the dapp is not supported on the network
   */
  async getLpReserves(
    dapp: Dapp,
    assetA: string,
    assetB: string
  ): Promise<Reserves> {
    if (dappFactoryAddress[this.network][dapp]) {
      const uniswapV2Factory = new Contract(
        dappFactoryAddress[this.network][dapp] as string,
        UniswapV2Factory.abi,
        this.signer
      );

      const uniswapV2PairAddress = await uniswapV2Factory.getPair(
        assetA,
        assetB
      );

      const uniswapV2Pair = new Contract(
        uniswapV2PairAddress,
        UniswapV2Pair.abi,
        this.signer
      );

      const result = await uniswapV2Pair.getReserves();
      const [reserve0, reserve1] = result;
      return assetA.toLowerCase() < assetB.toLowerCase()
        ? { assetA: reserve0, assetB: reserve1 }
        : { assetA: reserve1, assetB: reserve0 };
    } else {
      throw new Error("Dapp not supported on this network");
    }
  }

  /**
   * Returns the pool id of a liquidity pool
   * @param {Dapp} dApp DApp like uniswap or sushiswap
   * @param {string} lpPoolAddress token address of the pool pair
   * @returns {number} Pool Id
   * @throws if the dapp is not supported on the network
   */

  async getLpPoolId(dapp: Dapp, poolAsset: string): Promise<number> {
    if (stakingAddress[this.network][dapp]) {
      const masterChefV2 = new Contract(
        stakingAddress[this.network][dapp] as string,
        IMiniChefV2.abi,
        this.signer
      );

      const poolLength = await masterChefV2.poolLength();
      const idArray = Array.from(
        { length: poolLength.toNumber() },
        (_, v) => v
      );
      const lpPoolAddresses = await Promise.all(
        idArray.map(e => masterChefV2.lpToken(e))
      );
      const poolId = lpPoolAddresses
        .map(e => e.toLowerCase())
        .indexOf(poolAsset.toLocaleLowerCase());
      if (poolId === -1) {
        throw new Error("Staking not supported for asset");
      }
      return poolId;
    } else {
      throw new Error("Dapp not supported on this network");
    }
  }

  /**
   * Returns the balance of an asset (ERC20) token
   * @param {string} asset string token address
   * @param {string} owner address of the owner
   * @returns { BigNumber } Balance of asset
   */

  async getBalance(asset: string, owner: string): Promise<ethers.BigNumber> {
    const iERC20 = new ethers.Contract(asset, IERC20.abi, this.signer);
    const balance = await iERC20.balanceOf(owner);
    return balance;
  }

  /**
   * Returns the decimals of an asset (ERC20) token
   * @param {string} asset string token address
   * @returns { number } Balance of asset
   */

  async getDecimals(asset: string): Promise<number> {
    const iERC20 = new ethers.Contract(asset, IERC20.abi, this.signer);
    const decimals = await iERC20.decimals();
    return decimals;
  }

  /**
   * Return the minimum amount out for a trade between two assets
   * given the trade amount and slippage
   * @param {Dapp} dApp DApp like Uniswap or Sushiswap
   * @param {string} assetFrom Asset to trade from
   * @param {string} assetTo Asset to trade into
   * @param {string | ethers.BigNumber} amountIn Trade amount
   * @param { number} slippage Maximum slippage allowed
   * @returns {Promise<ethers.BigNumber>} Reserves of the assets in BigNumber
   */
  async getMinAmountOut(
    dapp: Dapp,
    assetFrom: string,
    assetTo: string,
    amountIn: string | ethers.BigNumber,
    slippage: number
  ): Promise<ethers.BigNumber> {
    const assetFromChecked = ethers.utils.getAddress(assetFrom);
    const assetToChecked = ethers.utils.getAddress(assetTo);
    const reserves = await this.getLpReserves(
      dapp,
      assetFromChecked,
      assetToChecked
    );
    const tokenA = new Token(
      networkChainIdMap[this.network],
      assetFromChecked,
      18
    );
    const tokenB = new Token(
      networkChainIdMap[this.network],
      assetToChecked,
      18
    );
    const pair = new Pair(
      new TokenAmount(tokenA, reserves.assetA.toString()),
      new TokenAmount(tokenB, reserves.assetB.toString())
    );
    const route = new Route([pair], tokenA, tokenB);

    const trade = new Trade(
      route,
      new TokenAmount(tokenA, amountIn.toString()),
      TradeType.EXACT_INPUT
    );
    return ethers.BigNumber.from(
      trade
        .minimumAmountOut(new Percent((slippage * 100).toFixed(), "10000"))
        .raw.toString()
    );
  }

  async getBalancerSwapTx(
    pool: Pool,
    assetFrom: string,
    assetTo: string,
    amountIn: ethers.BigNumber | string,
    slippage: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const sor = new SOR(
      this.signer.provider as BaseProvider,
      networkChainIdMap[this.network],
      balancerSubgraph[this.network]
    );
    // isFetched will be true on success
    const isFetched = await sor.fetchPools();

    if (!isFetched) throw new Error("Error fetching balancer pools");

    const swapType = SwapTypes.SwapExactIn;
    const { swaps, tokenAddresses, returnAmount } = await sor.getSwaps(
      assetFrom,
      assetTo,
      swapType,
      ethers.BigNumber.from(amountIn)
    );

    const minimumAmountOut = returnAmount
      .mul(10000 - slippage * 100)
      .div(10000);

    const iBalancerV2Vault = new ethers.utils.Interface(IBalancerV2Vault.abi);

    if (swaps.length === 1) {
      const swap = swaps[0];
      //do single swap
      const swapTx = iBalancerV2Vault.encodeFunctionData("swap", [
        [
          swap.poolId,
          SwapTypes.SwapExactIn,
          tokenAddresses[swap.assetInIndex],
          tokenAddresses[swap.assetOutIndex],
          swap.amount,
          swap.userData
        ],
        [pool.address, false, pool.address, false],
        minimumAmountOut,
        Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
      ]);
      return swapTx;
    } else {
      // Limits:
      // +ve means max to send
      // -ve mean min to receive
      // For a multihop the intermediate tokens should be 0
      const limits: string[] = [];
      tokenAddresses.forEach((token, i) => {
        if (token.toLowerCase() === assetFrom.toLowerCase()) {
          limits[i] = amountIn.toString();
        } else if (token.toLowerCase() === assetTo.toLowerCase()) {
          limits[i] = minimumAmountOut.mul(-1).toString();
        } else {
          limits[i] = "0";
        }
      });
      const swapTx = iBalancerV2Vault.encodeFunctionData("batchSwap", [
        SwapTypes.SwapExactIn,
        swaps,
        tokenAddresses,
        [pool.address, false, pool.address, false],
        limits,
        Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
      ]);
      return swapTx;
    }
  }

  async getBalancerJoinPoolTx(
    pool: Pool,
    balancerPoolId: string,
    assets: string[],
    amountsIn: string[] | ethers.BigNumber[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const iBalancerV2Vault = new ethers.utils.Interface(IBalancerV2Vault.abi);
    const bptAddress = ethers.utils.getAddress(balancerPoolId.slice(0, 42));
    const bptIndex = assets.findIndex(
      e => e.toLowerCase() === bptAddress.toLocaleLowerCase()
    );
    const poolAssetsAmounts = amountsIn.slice();
    if (bptIndex >= 0) poolAssetsAmounts.splice(bptIndex, 1);
    const txData = [
      balancerPoolId,
      pool.address,
      pool.address,
      [
        assets,
        amountsIn,
        ethers.utils.defaultAbiCoder.encode(
          ["uint256", "uint256[]", "uint256"],
          [1, poolAssetsAmounts, 0]
        ),
        false
      ]
    ];
    const joinPoolTx = iBalancerV2Vault.encodeFunctionData("joinPool", txData);
    return joinPoolTx;
  }

  async getBalancerExitPoolTx(
    pool: Pool,
    balancerPoolId: string,
    assets: string[],
    singleExitAssetIndex: null | number,
    amount: string | ethers.BigNumber

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const minimumAmountOut = new Array(assets.length).fill(0);
    const iBalancerV2Vault = new ethers.utils.Interface(IBalancerV2Vault.abi);
    const userTxData =
      singleExitAssetIndex === null
        ? ethers.utils.defaultAbiCoder.encode(
            ["uint256", "uint256"],
            [1, amount]
          )
        : ethers.utils.defaultAbiCoder.encode(
            ["uint256", "uint256", "uint256"],
            [0, amount, singleExitAssetIndex]
          );

    const txData = [
      balancerPoolId,
      pool.address,
      pool.address,
      [assets, minimumAmountOut, userTxData, false]
    ];
    const exitPoolTx = iBalancerV2Vault.encodeFunctionData("exitPool", txData);
    return exitPoolTx;
  }
}
