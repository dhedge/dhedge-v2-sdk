import { Contract, ethers, Wallet } from "ethers";

import IERC20 from "../abi/IERC20.json";
import IMiniChefV2 from "../abi/IMiniChefV2.json";
import UniswapV2Factory from "../abi/IUniswapV2Factory.json";
import UniswapV2Pair from "../abi/IUniswapV2Pair.json";
import { dappFactoryAddress, stakingAddress } from "../config";
import { Dapp, Network, Reserves } from "../types";

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
}
