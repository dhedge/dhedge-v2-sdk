/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { Contract, ethers, Wallet, BigNumber } from "ethers";

import IERC20 from "../abi/IERC20.json";
import IMiniChefV2 from "../abi/IMiniChefV2.json";
import ILendingPool from "../abi/ILendingPool.json";
import IUniswapV2Router from "../abi/IUniswapV2Router.json";
import IBalancerMerkleOrchard from "../abi/IBalancerMerkleOrchard.json";
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
   * Return the assets with balances and deposit info of a pool
   * @returns {Promise<FundComposition[]>} Composition of assets with balance, deposit info
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
   * Approve the asset that can be deposited into a pool
   * @param {string} nasset Address of deposit asset
   * @param {BigNumber | string} amount Amount to be approved
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async approveDeposit(
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iERC20 = new ethers.Contract(asset, IERC20.abi, this.signer);
    const tx = await iERC20.approve(this.address, amount, options);
    return tx;
  }

  /**
   * Deposit  asset into a pool
   * @param {string} asset Address of asset
   * @param {BigNumber | string} amount Amount to be deposited
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async deposit(
    asset: string,
    amount: string | BigNumber,
    options: any = null
  ): Promise<any> {
    const tx = await this.poolLogic.deposit(asset, amount, options);
    return tx;
  }

  /**
   * Withdraw  assets from a pool
   * @param fundTokenAmount Amount of pool tokens to be withdrawn
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async withdraw(
    fundTokenAmount: string | BigNumber,
    options: any = null
  ): Promise<any> {
    const tx = await this.poolLogic.withdraw(fundTokenAmount, options);
    return tx;
  }

  //Manager functions

  /**
   * Approve the asset for trading and providing liquidity
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Address of asset
   * @param @param {BigNumber | string} Amount to be approved
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async approve(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      routerAddress[this.network][dapp],
      amount
    ]);
    const tx = await this.poolLogic.execTransaction(
      asset,
      approveTxData,
      options
    );
    return tx;
  }

  /**
   * Approve the liquidity pool token for staking
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Address of liquidity pool token
   * @param {BigNumber | string} amount Aamount to be approved
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async approveStaking(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      stakingAddress[this.network][dapp],
      amount
    ]);
    const tx = await this.poolLogic.execTransaction(
      asset,
      approveTxData,
      options
    );
    return tx;
  }

  /**
   * Trade an asset into another asset
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} assetFrom Asset to trade from
   * @param {string} assetTo Asset to trade into
   * @param {BigNumber | string} amountIn Amount
   * @param {BigNumber | string} minAmountOut Minumum amount to receive
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async trade(
    dapp: Dapp,
    assetFrom: string,
    assetTo: string,
    amountIn: BigNumber | string,
    slippage = 0.5,
    options: any = null
  ): Promise<any> {
    let swapTxData: string;
    if (dapp === Dapp.ONEINCH) {
      const apiUrl = `https://api.1inch.exchange/v4.0/137/swap?fromTokenAddress=${assetFrom}&toTokenAddress=${assetTo}&amount=${amountIn.toString()}&fromAddress=${
        this.address
      }&destReceiver=${
        this.address
      }&slippage=${slippage.toString()}&disableEstimate=true`;
      const response = await axios.get(apiUrl);
      swapTxData = response.data.tx.data;
    } else if (dapp === Dapp.BALANCER) {
      swapTxData = await this.utils.getBalancerSwapTx(
        this,
        assetFrom,
        assetTo,
        amountIn,
        slippage
      );
    } else {
      const iUniswapV2Router = new ethers.utils.Interface(IUniswapV2Router.abi);
      const minAmountOut = await this.utils.getMinAmountOut(
        dapp,
        assetFrom,
        assetTo,
        amountIn,
        slippage
      );
      swapTxData = iUniswapV2Router.encodeFunctionData(Transaction.SWAP, [
        amountIn,
        minAmountOut,
        [assetFrom, assetTo],
        this.address,
        Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
      ]);
    }
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      swapTxData,
      options
    );
    return tx;
  }

  /**
   * Add liquidity to a liquidity pool
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amountA Amount first asset
   * @param {BigNumber | string} amountB Amount second asset
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async addLiquidity(
    dapp: Dapp,
    assetA: string,
    assetB: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string,
    options: any = null
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
      addLiquidityTxData,
      options
    );
    return tx;
  }

  /**
   * Remove liquidity from a liquidity pool
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amount Amount of liquidity pool tokens
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async removeLiquidity(
    dapp: Dapp,
    assetA: string,
    assetB: string,
    amount: string | BigNumber,
    options: any = null
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
      removeLiquidityTxData,
      options
    );
    return tx;
  }

  /**
   * Stake liquidity pool tokens in a yield farm
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Liquidity pool token
   * @param {BigNumber | string} amount Amount of liquidity pool tokens
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async stake(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null
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
      stakeTxData,
      options
    );

    return tx;
  }

  /**
   * Unstake liquidity pool tokens from a yield farm
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Liquidity pool token
   * @param  {BigNumber | string} amount Amount of liquidity pool tokens
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async unStake(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
    const poolId = await this.utils.getLpPoolId(dapp, asset);
    const unStakeTxData = iMiniChefV2.encodeFunctionData(Transaction.WITHDRAW, [
      poolId,
      amount,
      this.address
    ]);
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][dapp],
      unStakeTxData,
      options
    );
    return tx;
  }

  /**
   * Lend asset to a lending pool
   * @param {Dapp} dapp Platform like Aave
   * @param {string} asset Asset
   * @param  {BigNumber | string} amount Amount of asset to lend
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async lend(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const depositTxData = iLendingPool.encodeFunctionData(Transaction.DEPOSIT, [
      asset,
      amount,
      this.address,
      0
    ]);
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      depositTxData,
      options
    );
    return tx;
  }

  /**
   * Witdraw asset from a lending pool
   * @param {Dapp} dapp Platform like Aave
   * @param {string} asset Asset
   * @param  {BigNumber | string} amount Amount of asset to lend
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async withdrawDeposit(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const withdrawTxData = iLendingPool.encodeFunctionData(
      Transaction.WITHDRAW,
      [asset, amount, this.address]
    );
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      withdrawTxData,
      options
    );
    return tx;
  }

  /**
   * Borrow asset from a lending pool
   * @param {Dapp} dapp Platform like Aave
   * @param {string} asset Asset
   * @param  {BigNumber | string} amount Amount of asset to lend
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async borrow(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const borrowTxData = iLendingPool.encodeFunctionData(Transaction.BORROW, [
      asset,
      amount,
      2,
      0,
      this.address
    ]);
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      borrowTxData,
      options
    );
    return tx;
  }

  /**
   * Repays borrowed asset to a lending pool
   * @param {Dapp} dapp Platform like Aave
   * @param {string} asset Asset
   * @param  {BigNumber | string} amount Amount of asset to lend
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async repay(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const repayTxData = iLendingPool.encodeFunctionData(Transaction.REPAY, [
      asset,
      amount,
      2,
      this.address
    ]);
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      repayTxData,
      options
    );
    return tx;
  }

  /**
   * Claim rewards of staked liquidity pool tokens
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Liquidity pool token
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async harvestRewards(
    dapp: Dapp,
    asset: string,
    options: any = null
  ): Promise<any> {
    const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
    const poolId = await this.utils.getLpPoolId(dapp, asset);
    const harvestTxData = iMiniChefV2.encodeFunctionData(Transaction.HARVEST, [
      poolId,
      this.address
    ]);
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][dapp],
      harvestTxData,
      options
    );
    return tx;
  }

  /**
   * Change enabled pool assets
   * @param {AssetEnabled[]} assets New pool assets
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  public async changeAssets(
    assets: AssetEnabled[],
    options: any = null
  ): Promise<any> {
    const currentAssetsEnabled = await this.getComposition();
    const currentAssets = currentAssetsEnabled.map(e =>
      e.asset.toLocaleLowerCase()
    );
    const newAssets = assets.map(e => e.asset.toLocaleLowerCase());
    const removedAssets = currentAssets.filter(e => !newAssets.includes(e));
    const changedAssets = assets.map(e => [e.asset, e.isDeposit]);
    const tx = await this.managerLogic.changeAssets(
      changedAssets,
      removedAssets,
      options
    );
    return tx;
  }

  /**
   * Set a new trader with trading permissions
   * @param {string} trader Address trader account
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async setTrader(trader: string, options: any = null): Promise<any> {
    const tx = await this.managerLogic.setTrader(trader, options);
    return tx;
  }

  /**
   * Invest into a Balancer pool
   * @param {string} poolId Balancer pool id
   * @param {string[] | } assetsIn Array of balancer pool assets
   * @param {BigNumber[] | string[]} amountsIn Array of maximum amounts to provide to pool
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async joinBalancerPool(
    poolId: string,
    assets: string[],
    amountsIn: string[] | BigNumber[],
    options: any = null
  ): Promise<any> {
    const joinPoolTxData = this.utils.getBalancerJoinPoolTx(
      this,
      poolId,
      assets,
      amountsIn
    );
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][Dapp.BALANCER],
      joinPoolTxData,
      options
    );
    return tx;
  }

  /**
   * Invest into a Balancer pool
   * @param {string} poolId Balancer pool id
   * @param {string[] | } assets Array of balancer pool assets
   * @param {BigNumber | string } amount Amount of pool tokens to withdraw
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async exitBalancerPool(
    poolId: string,
    assets: string[],
    amount: string | BigNumber,
    options: any = null
  ): Promise<any> {
    const exitPoolTxData = this.utils.getBalancerExitPoolTx(
      this,
      poolId,
      assets,
      amount
    );
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][Dapp.BALANCER],
      exitPoolTxData,
      options
    );
    return tx;
  }

  /**
   * Claim rewards from Balancer pools
   * @param {string[]} assets Array of tokens being claimed
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async harvestBalancerRewards(
    assets: string[],
    options: any = null
  ): Promise<any> {
    const iBalancerMerkleOrchard = new ethers.utils.Interface(
      IBalancerMerkleOrchard.abi
    );
    const harvestTxData = iBalancerMerkleOrchard.encodeFunctionData(
      Transaction.CLAIM_DISTRIBIUTIONS,
      [this.address, [], assets]
    );
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][Dapp.BALANCER],
      harvestTxData,
      options
    );
    return tx;
  }
}
