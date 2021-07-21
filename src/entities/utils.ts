import { BigNumber, Contract, Wallet } from "ethers";

import IMiniChefV2 from "../abi/IMiniChefV2.json";
import UniswapV2Factory from "../abi/IUniswapV2Factory.json";
import UniswapV2Pair from "../abi/IUniswapV2Pair.json";
import { dappFactoryAddress, stakingAddress } from "../config";
import { Dapp, Network } from "../types";

export class Utils {
  network: Network;
  signer: Wallet;

  public constructor(network: Network, signer: Wallet) {
    this.network = network;
    this.signer = signer;
  }

  /**
   * Returns ration between two tokens of a liquidity pool
   * This is the price of one tokrn in the other
   * @param dApp dApp like uniswap or sushiswap
   * @param tokenA first token of the pool pair
   * @param tokenB second token of the pool pair
   * @param ratio given amount of the firt token
   * @throws if the dapp is not supported on the network
   */
  async getLpRatio(
    dapp: Dapp,
    tokenA: string,
    tokenB: string
  ): Promise<BigNumber> {
    if (dappFactoryAddress[this.network][dapp]) {
      const uniswapV2Factory = new Contract(
        dappFactoryAddress[this.network][dapp] as string,
        UniswapV2Factory.abi,
        this.signer
      );

      const uniswapV2PairAddress = await uniswapV2Factory.getPair(
        tokenA,
        tokenB
      );

      const uniswapV2Pair = new Contract(
        uniswapV2PairAddress,
        UniswapV2Pair.abi,
        this.signer
      );

      const result = await uniswapV2Pair.getReserves();
      const [reserve0, reserve1] = result;
      console.log(reserve0.toString());
      console.log(reserve1.toString());
      const ratio =
        tokenA.toLowerCase() < tokenB.toLowerCase()
          ? BigNumber.from(reserve1).div(reserve0)
          : BigNumber.from(reserve1).div(reserve1);
      return ratio;
    } else {
      throw new Error("Dapp not supported on this network");
    }
  }

  /**
   * Returns the amount of the other token that need to be provided to a liquidity pool
   * given the amount of one token
   * @param dApp dApp like uniswap or sushiswap
   * @param tokenA first token of the pool pair
   * @param tokenB second token of the pool pair
   * @param amountA given amount of the firt token
   * @throws if the dapp is not supported on the network
   */
  async getLpAmount(
    dapp: Dapp,
    tokenA: string,
    tokenB: string,
    amountA: string
  ): Promise<string> {
    if (dappFactoryAddress[this.network][dapp]) {
      const uniswapV2Factory = new Contract(
        dappFactoryAddress[this.network][dapp] as string,
        UniswapV2Factory.abi,
        this.signer
      );

      const uniswapV2PairAddress = await uniswapV2Factory.getPair(
        tokenA,
        tokenB
      );

      const uniswapV2Pair = new Contract(
        uniswapV2PairAddress,
        UniswapV2Pair.abi,
        this.signer
      );

      const result = await uniswapV2Pair.getReserves();
      const [reserve0, reserve1] = result;
      const amountB =
        tokenA.toLowerCase() < tokenB.toLowerCase()
          ? reserve1.mul(amountA).div(reserve0)
          : reserve0.mul(amountA).div(reserve1);
      return amountB.toString();
    } else {
      throw new Error("Dapp not supported on this network");
    }
  }

  /**
   * Returns the pool id of a liquidity pool
   * @param dApp dApp like uniswap or sushiswap
   * @param lpPoolAddress token address of the pool pair
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
}
