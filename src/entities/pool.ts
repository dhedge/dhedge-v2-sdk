/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { Contract, ethers, Wallet, BigNumber } from "ethers";

import IERC20 from "../abi/IERC20.json";
import IMiniChefV2 from "../abi/IMiniChefV2.json";
import ILendingPool from "../abi/ILendingPool.json";
import ISynthetix from "../abi/ISynthetix.json";
import IUniswapV2Router from "../abi/IUniswapV2Router.json";
import INonfungiblePositionManager from "../abi/INonfungiblePositionManager.json";
import IBalancerMerkleOrchard from "../abi/IBalancerMerkleOrchard.json";
import IAaveIncentivesController from "../abi/IAaveIncentivesController.json";
import IArrakisV1RouterStaking from "../abi/IArrakisV1RouterStaking.json";
import ILiquidityGaugeV4 from "../abi/ILiquidityGaugeV4.json";
import IBalancerRewardsGauge from "../abi/IBalancerRewardsGauge.json";

import {
  deadline,
  MaxUint128,
  networkChainIdMap,
  nonfungiblePositionManagerAddress,
  routerAddress,
  stakingAddress,
  SYNTHETIX_TRACKING_CODE
} from "../config";
import {
  Dapp,
  Transaction,
  FundComposition,
  AssetEnabled,
  Network
} from "../types";

import { Utils } from "./utils";
import { ClaimService } from "../services/claim-balancer/claim.service";
import {
  getUniswapV3DecreaseLiqTxData,
  getUniswapV3MintTxData,
  nonfungiblePositionManagerAbi
} from "../services/uniswap/V3Liquidity";
import { FeeAmount } from "@uniswap/v3-sdk";
import { getUniswapV3SwapTxData } from "../services/uniswap/V3Trade";
import { getEasySwapperTxData } from "../services/toros/easySwapper";
import { getOneInchProtocols } from "../services/oneInch/protocols";
import { getAaveV3ClaimTxData } from "../services/aave/incentives";
import {
  getKyberDepositTxData,
  getKyberStakeTxData,
  getKyberUnStakeTxData
} from "../services/uniswap/kyberFork";

export class Pool {
  public readonly poolLogic: Contract;
  public readonly managerLogic: Contract;
  public readonly factory: Contract;
  public readonly signer: Wallet;
  public readonly address: string;
  public readonly utils: Utils;
  public readonly network: Network;

  public constructor(
    network: Network,
    signer: Wallet,
    poolLogic: Contract,
    mangerLogic: Contract,
    utils: Utils,
    factory: Contract
  ) {
    this.network = network;
    this.poolLogic = poolLogic;
    this.address = poolLogic.address;
    this.managerLogic = mangerLogic;
    this.signer = signer;
    this.utils = utils;
    this.factory = factory;
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
   * Approve token for UniV3 pools
   * @param {Dapp} dapp Platform either UniswapV3 or Kyber
   * @param {string} asset Address of liquidity pool token
   * @param {BigNumber | string} amount Aamount to be approved
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async approveUniswapV3Liquidity(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      nonfungiblePositionManagerAddress[this.network][dapp],
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
   * Approve the asset for provided spender address
   * @param {string} spender Spender address
   * @param {string} asset Address of asset
   * @param {BigNumber | string} amount to be approved
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async approveSpender(
    spender: string,
    asset: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      spender,
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
   * @param {number} slippage Slippage tolerance in %
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
    switch (dapp) {
      case Dapp.ONEINCH:
        const chainId = networkChainIdMap[this.network];
        const protocols = await getOneInchProtocols(chainId);
        const apiUrl = `https://api.1inch.exchange/v4.0/${chainId}/swap?fromTokenAddress=${assetFrom}&toTokenAddress=${assetTo}&amount=${amountIn.toString()}&fromAddress=${
          this.address
        }&destReceiver=${
          this.address
        }&slippage=${slippage.toString()}&disableEstimate=true${protocols}`;
        const response = await axios.get(apiUrl);
        swapTxData = response.data.tx.data;
        break;
      case Dapp.BALANCER:
        swapTxData = await this.utils.getBalancerSwapTx(
          this,
          assetFrom,
          assetTo,
          amountIn,
          slippage
        );
        break;
      case Dapp.SYNTHETIX:
        const iSynthetix = new ethers.utils.Interface(ISynthetix.abi);
        const assets = [assetFrom, assetTo].map(asset =>
          ethers.utils.formatBytes32String(asset)
        );
        const daoAddress = await this.factory.owner();
        swapTxData = iSynthetix.encodeFunctionData(Transaction.SWAP_SYNTHS, [
          assets[0],
          amountIn,
          assets[1],
          daoAddress,
          SYNTHETIX_TRACKING_CODE
        ]);
        break;
      case Dapp.TOROS:
        swapTxData = await getEasySwapperTxData(
          this,
          assetFrom,
          assetTo,
          ethers.BigNumber.from(amountIn),
          slippage
        );
        break;
      default:
        const iUniswapV2Router = new ethers.utils.Interface(
          IUniswapV2Router.abi
        );
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
          deadline
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
      [assetA, assetB, amountA, amountB, 0, 0, this.address, deadline]
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
      [assetA, assetB, amount, 0, 0, this.address, deadline]
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
   * @param {Dapp} dapp Platform like Sushiswap or Kyber
   * @param {string} asset Liquidity pool token
   * @param {BigNumber | string} amount Amount of liquidity pool tokens
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async stake(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string | null,
    options: any = null
  ): Promise<any> {
    if (dapp !== Dapp.SUSHISWAP && dapp !== Dapp.KYBER)
      throw new Error("dapp not supported");
    let stakeTxData;
    if (dapp === Dapp.SUSHISWAP) {
      const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
      const poolId = await this.utils.getLpPoolId(dapp, asset);
      stakeTxData = iMiniChefV2.encodeFunctionData(Transaction.DEPOSIT, [
        poolId,
        amount,
        this.address
      ]);
    } else {
      stakeTxData = getKyberStakeTxData(this, asset);
    }
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][dapp],
      stakeTxData,
      options
    );
    return tx;
  }

  /**
   * Stake liquidity pool tokens in gauge contract
   * @param {string} gauge Gauge contract address
   * @param {BigNumber | string} amount Amount of liquidity pool tokens
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async stakeInGauge(
    gauge: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const rewardsGauge = new ethers.utils.Interface(IBalancerRewardsGauge.abi);
    const stakeTxData = rewardsGauge.encodeFunctionData("deposit(uint256)", [
      amount
    ]);
    const tx = await this.poolLogic.execTransaction(
      gauge,
      stakeTxData,
      options
    );
    return tx;
  }

  /**
   * Unstake liquidity pool tokens from a yield farm
   * @param {Dapp} dapp Platform like Sushiswap or Kyber
   * @param {string} asset Liquidity pool token
   * @param  {BigNumber | string} amount Amount of liquidity pool tokens
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async unStake(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string | null,
    options: any = null
  ): Promise<any> {
    if (dapp !== Dapp.SUSHISWAP && dapp !== Dapp.KYBER)
      throw new Error("dapp not supported");
    let unStakeTxData;
    if (dapp === Dapp.SUSHISWAP) {
      const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
      const poolId = await this.utils.getLpPoolId(dapp, asset);
      unStakeTxData = iMiniChefV2.encodeFunctionData(Transaction.WITHDRAW, [
        poolId,
        amount,
        this.address
      ]);
    } else {
      unStakeTxData = getKyberUnStakeTxData(this, asset);
    }
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][dapp],
      unStakeTxData,
      options
    );
    return tx;
  }

  /**
   * Unstake liquidity pool tokens from gauge contract
   * @param {string} gauge Gauge contract address
   * @param {BigNumber | string} amount Amount of liquidity pool tokens
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async unstakeFromGauge(
    gauge: string,
    amount: BigNumber | string,
    options: any = null
  ): Promise<any> {
    const rewardsGauge = new ethers.utils.Interface(IBalancerRewardsGauge.abi);
    const unstakeTxData = rewardsGauge.encodeFunctionData("withdraw(uint256)", [
      amount
    ]);
    const tx = await this.poolLogic.execTransaction(
      gauge,
      unstakeTxData,
      options
    );
    return tx;
  }

  /**
   * Lend asset to a lending pool
   * @param {Dapp} dapp Platform like Aave
   * @param {string} asset Asset
   * @param {BigNumber | string} amount Amount of asset to lend
   * @param {number} referralCode Code from Aave referral program
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async lend(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    referralCode = 0,
    options: any = null
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const depositTxData = iLendingPool.encodeFunctionData(Transaction.DEPOSIT, [
      asset,
      amount,
      this.address,
      referralCode
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
   * @param {number} referralCode Code from Aave referral program
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async borrow(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    referralCode = 0,
    options: any = null
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const borrowTxData = iLendingPool.encodeFunctionData(Transaction.BORROW, [
      asset,
      amount,
      2,
      referralCode,
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
   * @param { null | number } singleExitAssetIndex Index of asset to withdraw to
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async exitBalancerPool(
    poolId: string,
    assets: string[],
    amount: string | BigNumber,
    singleExitAssetIndex: number | null = null,
    options: any = null
  ): Promise<any> {
    const exitPoolTxData = this.utils.getBalancerExitPoolTx(
      this,
      poolId,
      assets,
      singleExitAssetIndex,
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
  async harvestBalancerRewards(options: any = null): Promise<any> {
    const claimService = new ClaimService(this.network, this.signer);
    const multiTokenPendingClaims = await claimService.getMultiTokensPendingClaims(
      this.address
    );
    const tokens = multiTokenPendingClaims.map(
      tokenPendingClaims => tokenPendingClaims.tokenClaimInfo.token
    );
    const claims = await claimService.multiTokenClaimRewards(
      this.address,
      multiTokenPendingClaims
    );
    const iBalancerMerkleOrchard = new ethers.utils.Interface(
      IBalancerMerkleOrchard.abi
    );
    const harvestTxData = iBalancerMerkleOrchard.encodeFunctionData(
      Transaction.CLAIM_DISTRIBIUTIONS,
      [this.address, claims, tokens]
    );
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][Dapp.BALANCER],
      harvestTxData,
      options
    );
    return tx;
  }

  /**
   * Claim rewards from Aave platform
   * @param {string[]} assets Aave tokens (deposit/debt) hold by pool
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async harvestAaveRewards(
    assets: string[],
    options: any = null
  ): Promise<any> {
    const aaveIncentivesAddress = stakingAddress[this.network][
      Dapp.AAVE
    ] as string;
    const iAaveIncentivesController = new ethers.utils.Interface(
      IAaveIncentivesController.abi
    );
    const aaveIncentivesController = new ethers.Contract(
      aaveIncentivesAddress,
      iAaveIncentivesController,
      this.signer
    );
    const amount = await aaveIncentivesController.getUserUnclaimedRewards(
      this.address
    );
    const claimTxData = iAaveIncentivesController.encodeFunctionData(
      Transaction.CLAIM_REWARDS,
      [assets, amount, this.address]
    );
    const tx = await this.poolLogic.execTransaction(
      aaveIncentivesAddress,
      claimTxData,
      options
    );
    return tx;
  }

  /**
   * Claim rewards from Aave platform
   * @param {string[]} assets Assets invested in Aave
   * @param {string} rewardAssets Reward token address
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async harvestAaveV3Rewards(
    assets: string[],
    rewardAsset: string,
    options: any = null
  ): Promise<any> {
    const claimTxData = await getAaveV3ClaimTxData(this, assets, rewardAsset);
    const tx = await this.poolLogic.execTransaction(
      stakingAddress[this.network][Dapp.AAVEV3] as string,
      claimTxData,
      options
    );
    return tx;
  }

  /**
   * Create UniswapV3 liquidity pool
   * @param {Dapp} dapp Platform either UniswapV3 or Kyber
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amountA Amount first asset
   * @param {BigNumber | string} amountB Amount second asset
   * @param { number } minPrice Lower price range (assetB per assetA)
   * @param { number } maxPrice Upper price range (assetB per assetA)
   * @param { number } minTick Lower tick range
   * @param { number } maxTick Upper tick range
   * @param { FeeAmount } feeAmount Fee tier (Low 0.05%, Medium 0.3%, High 1%)
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async addLiquidityUniswapV3(
    dapp: Dapp,
    assetA: string,
    assetB: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string,
    minPrice: number | null,
    maxPrice: number | null,
    minTick: number | null,
    maxTick: number | null,
    feeAmount: FeeAmount,
    options: any = null
  ): Promise<any> {
    if (
      (minPrice === null || maxPrice === null) &&
      (minTick === null || maxTick === null)
    )
      throw new Error("Need to provide price or tick range");

    if ((minTick === null || maxTick === null) && dapp === Dapp.KYBER)
      throw new Error("Need to provide tick range for Kyber pool");

    const mintTxData = await getUniswapV3MintTxData(
      this,
      dapp,
      assetA,
      assetB,
      amountA,
      amountB,
      minPrice,
      maxPrice,
      minTick,
      maxTick,
      feeAmount
    );

    const tx = await this.poolLogic.execTransaction(
      nonfungiblePositionManagerAddress[this.network][dapp],
      mintTxData,
      options
    );
    return tx;
  }

  /**
   * Remove liquidity from an UniswapV3 or Arrakis liquidity pool
   * @param {Dapp} dapp Platform either UniswapV3 or Arrakis
   * @param {string} tokenId Token Id of UniswapV3 position
   * @param {number} amount Amount in percent of assets to be removed
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async decreaseLiquidity(
    dapp: Dapp,
    tokenId: string,
    amount = 100,
    options: any = null
  ): Promise<any> {
    let txData;
    let dappAddress;
    if (dapp === Dapp.UNISWAPV3 || dapp === Dapp.KYBER) {
      dappAddress = nonfungiblePositionManagerAddress[this.network][dapp];
      txData = await getUniswapV3DecreaseLiqTxData(this, dapp, tokenId, amount);
    } else if (dapp === Dapp.ARRAKIS) {
      dappAddress = routerAddress[this.network][dapp];
      const abi = new ethers.utils.Interface(IArrakisV1RouterStaking.abi);
      const liquidity = (await this.utils.getBalance(tokenId, this.address))
        .mul(Math.round(amount * 1e4))
        .div(1e6);
      txData = abi.encodeFunctionData(Transaction.REMOVE_LIQUIDITY_UNSTAKE, [
        tokenId,
        liquidity,
        0,
        0,
        this.address
      ]);
    } else {
      throw new Error("dapp not supported");
    }
    const tx = await this.poolLogic.execTransaction(
      dappAddress,
      txData,
      options
    );
    return tx;
  }

  /**
   * Increase liquidity of an UniswapV3 or Arrakis liquidity pool
   * @param {Dapp} dapp Platform either UniswapV3 or Arrakis
   * @param {string} tokenId Token Id of UniswapV3 position
   * @param {BigNumber | string} amountA Amount first asset
   * @param {BigNumber | string} amountB Amount second asset
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async increaseLiquidity(
    dapp: Dapp,
    tokenId: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string,
    options: any = null
  ): Promise<any> {
    let txData;
    let dappAddress;
    if (dapp === Dapp.UNISWAPV3 || dapp === Dapp.KYBER) {
      dappAddress = nonfungiblePositionManagerAddress[this.network][dapp];
      const functionName =
        dapp === Dapp.UNISWAPV3
          ? Transaction.INCREASE_LIQUIDITY
          : Transaction.ADD_LIQUIDITY;
      txData = nonfungiblePositionManagerAbi(
        dapp
      ).encodeFunctionData(functionName, [
        [tokenId, amountA, amountB, 0, 0, deadline]
      ]);
    } else if (dapp === Dapp.ARRAKIS) {
      dappAddress = routerAddress[this.network][dapp];
      const abi = new ethers.utils.Interface(IArrakisV1RouterStaking.abi);
      txData = abi.encodeFunctionData(Transaction.ADD_LIQUIDITY_STAKE, [
        tokenId,
        amountA,
        amountB,
        0,
        0,
        this.address
      ]);
    } else {
      throw new Error("dapp not supported");
    }

    const tx = await this.poolLogic.execTransaction(
      dappAddress,
      txData,
      options
    );
    return tx;
  }

  /**
   * Claim fees of an UniswapV3 liquidity or Arrakis pool
   * @param {Dapp} dapp Platform either UniswapV3 or Arrakis
   * @param {string} tokenId Token Id of UniswapV3 or Gauge address
   * @param {any} options Transaction option
   * @returns {Promise<any>} Transaction
   */
  async claimFees(
    dapp: Dapp,
    tokenId: string,
    options: any = null
  ): Promise<any> {
    let txData;
    let contractAddress;
    if (dapp === Dapp.UNISWAPV3) {
      contractAddress = nonfungiblePositionManagerAddress[this.network];
      const iNonfungiblePositionManager = new ethers.utils.Interface(
        INonfungiblePositionManager.abi
      );
      txData = iNonfungiblePositionManager.encodeFunctionData(
        Transaction.COLLECT,
        [[tokenId, this.address, MaxUint128, MaxUint128]]
      );
    } else if (dapp === Dapp.ARRAKIS || dapp === Dapp.BALANCER) {
      contractAddress = tokenId;
      const abi = new ethers.utils.Interface(ILiquidityGaugeV4.abi);
      txData = abi.encodeFunctionData("claim_rewards()", []);
    } else {
      throw new Error("dapp not supported");
    }
    const tx = await this.poolLogic.execTransaction(
      contractAddress,
      txData,
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
   * @param { FeeAmount } feeAmount Fee tier (Low 0.05%, Medium 0.3%, High 1%)
   * @param {number} slippage Slippage tolerance in %
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async tradeUniswapV3(
    assetFrom: string,
    assetTo: string,
    amountIn: BigNumber | string,
    feeAmount: FeeAmount,
    slippage = 0.5,
    options: any = null
  ): Promise<any> {
    const swapxData = await getUniswapV3SwapTxData(
      this,
      assetFrom,
      assetTo,
      amountIn,
      slippage,
      feeAmount
    );
    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][Dapp.UNISWAPV3],
      swapxData,
      options
    );
    return tx;
  }

  /**
   * Deposit liquidity pool token in a yield farm
   * @param {Dapp} dapp Platform like  Kyber
   * @param {string} tokenId Liquidity pool token ID
   * @param {any} options Transaction options
   * @returns {Promise<any>} Transaction
   */
  async depositLP(
    dapp: Dapp,
    tokenId: string,
    options: any = null
  ): Promise<any> {
    if (dapp !== Dapp.KYBER) throw new Error("dapp not supported");
    return await this.poolLogic.execTransaction(
      stakingAddress[this.network][dapp],
      getKyberDepositTxData(tokenId),
      options
    );
  }
}
