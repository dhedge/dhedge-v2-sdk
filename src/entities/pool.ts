/* eslint-disable @typescript-eslint/no-explicit-any */
import { Contract, ethers, Wallet, BigNumber } from "ethers";

import IERC20 from "../abi/IERC20.json";
import IMiniChefV2 from "../abi/IMiniChefV2.json";
import IUniswapV2Router from "../abi/IUniswapV2Router.json";
import { routerAddress, stakingAddress } from "../config";
import {
  Dapp,
  Transaction,
  FundComposition,
  AssetEnabled,
  Network
} from "../types";

import { Utils } from "./utils";

export class Pool {
  public readonly poolLogic: Contract;
  public readonly managerLogic: Contract;
  public readonly signer: Wallet;
  public readonly address: string;
  public readonly utils: Utils;
  public readonly network: Network;

  public constructor(
    network: Network,
    signer: Wallet,
    poolLogic: Contract,
    mangerLogic: Contract,
    utils: Utils
  ) {
    this.network = network;
    this.poolLogic = poolLogic;
    this.address = poolLogic.address;
    this.managerLogic = mangerLogic;
    this.signer = signer;
    this.utils = utils;
  }

  /**
   * Returns the assets with balances and deposit info of a pool
   */
  async getComposition(): Promise<FundComposition[]> {
    const result = await this.managerLogic.getFundComposition();

    const fundComposition: FundComposition[] = result[0].map(
      (item: AssetEnabled, index: string | number) => {
        const { asset, isDeposit } = item;
        return {
          asset: asset,
          isDeposit: isDeposit,
          balance: result[1][index],
          rate: result[2][index]
        };
      }
    );
    return fundComposition;
  }

  //Invest functions

  /**
   * Approves the asset that can be deposited into a pool
   * @param asset address of deposit asset
   * @param amount amount to be approved
   */
  async approveDeposit(
    asset: string,
    amount: BigNumber | string
  ): Promise<any> {
    const iERC20 = new ethers.Contract(asset, IERC20.abi, this.signer);
    const tx = await iERC20.approve(this.address, amount);
    return tx;
  }

  /**
   * Deposits  asset into a pool
   * @param asset address of asset
   * @param amount amount to be deposited
   */
  async deposit(asset: string, amount: string | BigNumber): Promise<any> {
    const tx = await this.poolLogic.deposit(asset, amount);
    return tx;
  }

  //Manager functions

  /**
   * Approves the asset for trading and providing liquidity
   * @param dapp platform like Sushiswap or Uniswap
   * @param asset address of asset
   * @param amount amount to be approved
   */
  async approve(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      routerAddress[this.network][dapp],
      amount
    ]);
    const tx = await this.poolLogic.execTransaction(asset, approveTxData);
    return tx;
  }

  /**
   * Approves the liquidity pool token for staking
   * @param dapp platform like Sushiswap or Uniswap
   * @param asset address of liquidity pool token
   * @param amount amount to be approved
   * @param staking approve for staking
   */
  async approveStaking(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      stakingAddress[this.network][dapp],
      amount
    ]);
    const tx = await this.poolLogic.execTransaction(asset, approveTxData);
    return tx;
  }

  /**
   * Trades an asset into another asset
   * @param dapp platform like Sushiswap or Uniswap
   * @param assetFrom asset to trade from
   * @param assetTo asset to trade into
   * @param amountIn amount
   * @param minAmountOut minumum amount of asset to receive
   */
  async trade(
    dapp: Dapp,
    assetFrom: string,
    assetTo: string,
    amountIn: BigNumber | string,
    minAmountOut: BigNumber | string
  ): Promise<any> {
    const iUniswapV2Router = new ethers.utils.Interface(IUniswapV2Router.abi);
    const swapTxData = iUniswapV2Router.encodeFunctionData(Transaction.SWAP, [
      amountIn,
      minAmountOut,
      [assetFrom, assetTo],
      this.address,
      Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
    ]);
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      swapTxData
    );
    return tx;
  }

  /**
   * Adds liquidity to a liquidity pool
   * @param dapp platform like Sushiswap or Uniswap
   * @param assetA first asset
   * @param assetB second asset
   * @param amountA amount first asset
   * @param amountB amount second asset
   */
  async addLiquidity(
    dapp: Dapp,
    assetA: string,
    assetB: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string
  ): Promise<any> {
    const iUniswapV2Router = new ethers.utils.Interface(IUniswapV2Router.abi);
    const addLiquidityTxData = iUniswapV2Router.encodeFunctionData(
      Transaction.ADD_LIQUIDITY,
      [
        assetA,
        assetB,
        amountA,
        amountB,
        0,
        0,
        this.address,
        Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
      ]
    );
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      addLiquidityTxData
    );
    return tx;
  }

  /**
   * Removes liquidity from a liquidity pool
   * @param dapp platform like Sushiswap or Uniswap
   * @param assetA first asset
   * @param assetB second asset
   * @param amount amount of liquidity pool tokens
   */
  async removeLiquidity(
    dapp: Dapp,
    assetA: string,
    assetB: string,
    amount: string | BigNumber
  ): Promise<any> {
    const iUniswapV2Router = new ethers.utils.Interface(IUniswapV2Router.abi);
    const removeLiquidityTxData = iUniswapV2Router.encodeFunctionData(
      Transaction.REMOVE_LIQUIDITY,
      [
        assetA,
        assetB,
        amount,
        0,
        0,
        this.address,
        Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
      ]
    );
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      removeLiquidityTxData
    );
    return tx;
  }

  /**
   * Stakes liquidity pool tokens in a yield farm
   * @param dapp platform like Sushiswap or Uniswap
   * @param asset liquidity pool token
   * @param amount amount of liquidity pool tokens
   */
  async stake(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
    const poolId = await this.utils.getLpPoolId(dapp, asset);
    const stakeTxData = iMiniChefV2.encodeFunctionData(Transaction.DEPOSIT, [
      poolId,
      amount,
      this.address
    ]);
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][dapp],
      stakeTxData
    );

    return tx;
  }

  /**
   * Ustakes liquidity pool tokens from a yield farm
   * @param dapp platform like Sushiswap or Uniswap
   * @param asset liquidity pool token
   * @param amount amount of liquidity pool tokens
   */
  async unStake(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string
  ): Promise<any> {
    const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
    const poolId = await this.utils.getLpPoolId(dapp, asset);
    const unStakeTxData = iMiniChefV2.encodeFunctionData(Transaction.UNSTAKE, [
      poolId,
      amount,
      this.address
    ]);
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][dapp],
      unStakeTxData
    );
    return tx;
  }

  /**
   * Claims rewards of staked liquidity pool tokens
   * @param dapp platform like Sushiswap or Uniswap
   * @param asset liquidity pool token
   */
  async harvestRewards(dapp: Dapp, asset: string): Promise<any> {
    const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
    const poolId = await this.utils.getLpPoolId(dapp, asset);
    const harvestTxData = iMiniChefV2.encodeFunctionData(Transaction.HARVEST, [
      poolId,
      this.address
    ]);
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][dapp],
      harvestTxData
    );
    return tx;
  }

  /**
   * Changes enabled pool assets
   * @param dapp platform like Sushiswap or Uniswap
   * @param assets new enabled pool asset
   */
  public async changeAssets(assets: AssetEnabled[]): Promise<any> {
    const currentAssetsEnabled = await this.getComposition();
    const currentAssets = currentAssetsEnabled.map(e =>
      e.asset.toLocaleLowerCase()
    );
    const newAssets = assets.map(e => e.asset.toLocaleLowerCase());
    const removedAssets = currentAssets.filter(e => !newAssets.includes(e));
    const changedAssets = assets.map(e => [e.asset, e.isDeposit]);
    const tx = await this.managerLogic.changeAssets(
      changedAssets,
      removedAssets
    );
    return tx;
  }

  /**
   * Sets a new trader with trading permissions
   * @param trader address of user account trading permissions
   */
  async setTrader(trader: string): Promise<any> {
    const tx = await this.managerLogic.setTrader(trader);
    return tx;
  }

  async withdraw(fundTokenAmount: string | BigNumber): Promise<any> {
    const tx = await this.poolLogic.withdraw(fundTokenAmount);
    return tx;
  }
}
