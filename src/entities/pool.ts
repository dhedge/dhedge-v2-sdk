/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Contract, ethers, Wallet, BigNumber } from "ethers";

import IERC20 from "../abi/IERC20.json";

import IERC721 from "../abi/IERC721.json";
import IMiniChefV2 from "../abi/IMiniChefV2.json";
import ILendingPool from "../abi/ILendingPool.json";
import ISynthetix from "../abi/ISynthetix.json";
import IUniswapV2Router from "../abi/IUniswapV2Router.json";
import INonfungiblePositionManager from "../abi/INonfungiblePositionManager.json";
import IAaveIncentivesController from "../abi/IAaveIncentivesController.json";
import ILiquidityGaugeV4 from "../abi/ILiquidityGaugeV4.json";
import IBalancerRewardsGauge from "../abi/IBalancerRewardsGauge.json";

import {
  MaxUint128,
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
  Network,
  LyraOptionMarket,
  LyraOptionType,
  LyraTradeType,
  LyraPosition
} from "../types";

import { Utils } from "./utils";
import {
  getDecreaseLiquidityTxData,
  getIncreaseLiquidityTxData,
  getUniswapV3MintTxData
} from "../services/uniswap/V3Liquidity";
import { getUniswapV3SwapTxData } from "../services/uniswap/V3Trade";
import {
  getCompleteWithdrawalTxData,
  getEasySwapperTxData
} from "../services/toros/easySwapper";
import { getAaveV3ClaimTxData } from "../services/aave/incentives";
import {
  getClOwner,
  getVelodromeAddLiquidityTxData,
  getVelodromeRemoveLiquidityTxData
} from "../services/velodrome/liquidity";
import {
  getVelodromeClaimTxData,
  getVelodromeCLClaimTxData,
  getVelodromeStakeTxData
} from "../services/velodrome/staking";
import { getLyraOptionTxData } from "../services/lyra/trade";
import { getOptionPositions } from "../services/lyra/positions";
import { getDeadline } from "../utils/deadline";
import {
  getFuturesChangePositionTxData,
  getFuturesChangeMarginTxData
} from "../services/futures";
import { getFuturesCancelOrderTxData } from "../services/futures/trade";
import { getZeroExTradeTxData } from "../services/zeroEx/zeroExTrade";
import { getOneInchSwapTxData } from "../services/oneInch";
import {
  getCreateVestTxData,
  getExitVestTxData,
  getRewardsTxDta
} from "../services/ramses/vesting";
import { getPoolTxOrGasEstimate } from "../utils/contract";
import {
  cancelOrderViaFlatMoney,
  mintUnitViaFlatMoney,
  redeemUnitViaFlatMoney
} from "../services/flatmoney/stableLp";
import {
  getCompoundV3LendTxData,
  getCompoundV3WithdrawTxData
} from "../services/compound/lending";
import {
  getPancakeStakeTxData,
  getPancakeUnStakeTxData
} from "../services/pancake/staking";

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
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async approveDeposit(
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iERC20 = new ethers.Contract(asset, IERC20.abi, this.signer);
    if (estimateGas) {
      return await iERC20.estimateGas.approve(this.address, amount, options);
    }
    const tx = await iERC20.approve(this.address, amount, options);
    return tx;
  }

  /**
   * Deposit  asset into a pool
   * @param {string} asset Address of asset
   * @param {BigNumber | string} amount Amount to be deposited
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async deposit(
    asset: string,
    amount: string | BigNumber,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    if (estimateGas) {
      return await this.poolLogic.estimateGas.deposit(asset, amount, options);
    }
    const tx = await this.poolLogic.deposit(asset, amount, options);
    return tx;
  }

  /**
   * Withdraw  assets from a pool
   * @param fundTokenAmount Amount of pool tokens to be withdrawn
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async withdraw(
    fundTokenAmount: string | BigNumber,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    if (estimateGas) {
      return await this.poolLogic.estimateGas.withdraw(
        fundTokenAmount,
        options
      );
    }
    const tx = await this.poolLogic.withdraw(fundTokenAmount, options);
    return tx;
  }

  //Manager functions

  /**
   * Approve the asset for trading and providing liquidity
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Address of asset
   * @param {BigNumber | string} Amount to be approved
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async approve(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      routerAddress[this.network][dapp],
      amount
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [asset, approveTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Approve the liquidity pool token for staking
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Address of liquidity pool token
   * @param {BigNumber | string} amount Aamount to be approved
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async approveStaking(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      stakingAddress[this.network][dapp],
      amount
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [asset, approveTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Approve the liquidity pool token for staking
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Address of liquidity pool token
   * @param {BigNumber | string} amount Aamount to be approved
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async approveUniswapV3Liquidity(
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      nonfungiblePositionManagerAddress[this.network][Dapp.UNISWAPV3],
      amount
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [asset, approveTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Approve the asset for provided spender address
   * @param {string} spender Spender address
   * @param {string} asset Address of asset
   * @param {BigNumber | string} amount to be approved
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async approveSpender(
    spender: string,
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approveTxData = iERC20.encodeFunctionData("approve", [
      spender,
      amount
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [asset, approveTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Approve NFT for provided spender address
   * @param {string} spender Spender address
   * @param {string} asset Address of asset
   * @param {string} tokenId NFT id
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async approveSpenderNFT(
    spender: string,
    asset: string,
    tokenId: string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iERC721 = new ethers.utils.Interface(IERC721.abi);
    const approveTxData = iERC721.encodeFunctionData("approve", [
      spender,
      tokenId
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [asset, approveTxData, options],
      estimateGas
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
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async trade(
    dapp: Dapp,
    assetFrom: string,
    assetTo: string,
    amountIn: BigNumber | string,
    slippage = 0.5,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    let swapTxData: string;
    switch (dapp) {
      case Dapp.ZEROEX:
        swapTxData = await getZeroExTradeTxData(
          this.network,
          assetFrom,
          assetTo,
          amountIn,
          slippage,
          this.address
        );
        break;
      case Dapp.ONEINCH:
        ({ swapTxData } = await getOneInchSwapTxData(
          this,
          assetFrom,
          assetTo,
          amountIn,
          slippage
        ));
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
          await getDeadline(this)
        ]);
    }
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][dapp], swapTxData, options],
      estimateGas
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
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async addLiquidity(
    dapp: Dapp,
    assetA: string,
    assetB: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string,
    options: any = null,
    estimateGas = false
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
        await getDeadline(this)
      ]
    );
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][dapp], addLiquidityTxData, options],
      estimateGas
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
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async removeLiquidity(
    dapp: Dapp,
    assetA: string,
    assetB: string,
    amount: string | BigNumber,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iUniswapV2Router = new ethers.utils.Interface(IUniswapV2Router.abi);
    const removeLiquidityTxData = iUniswapV2Router.encodeFunctionData(
      Transaction.REMOVE_LIQUIDITY,
      [assetA, assetB, amount, 0, 0, this.address, await getDeadline(this)]
    );
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][dapp], removeLiquidityTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Stake liquidity pool tokens in a yield farm
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Liquidity pool token
   * @param {BigNumber | string} amount Amount of liquidity pool tokens
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async stake(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
    const poolId = await this.utils.getLpPoolId(dapp, asset);
    const stakeTxData = iMiniChefV2.encodeFunctionData(Transaction.DEPOSIT, [
      poolId,
      amount,
      this.address
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [stakingAddress[this.network][dapp], stakeTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Stake liquidity pool tokens in gauge contract
   * @param {Dapp} dapp Platform like Balancer or Velodrome
   * @param {string} gauge Gauge contract address
   * @param {BigNumber | string} amount Amount of liquidity pool tokens or token ID for Velodrome CL
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async stakeInGauge(
    dapp: Dapp,
    gauge: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    let stakeTxData;
    switch (dapp) {
      case Dapp.BALANCER:
        const rewardsGauge = new ethers.utils.Interface(
          IBalancerRewardsGauge.abi
        );
        stakeTxData = rewardsGauge.encodeFunctionData("deposit(uint256)", [
          amount
        ]);
        break;
      case Dapp.VELODROME:
      case Dapp.RAMSES:
        stakeTxData = getVelodromeStakeTxData(amount, false);
        break;
      case Dapp.VELODROMEV2:
      case Dapp.AERODROME:
      case Dapp.VELODROMECL:
      case Dapp.AERODROMECL:
        stakeTxData = getVelodromeStakeTxData(amount, true);
        break;
      case Dapp.PANCAKECL:
        stakeTxData = getPancakeStakeTxData;
        break;
      default:
        throw new Error("dapp not supported");
    }
    const txTo =
      dapp !== Dapp.PANCAKECL
        ? gauge
        : nonfungiblePositionManagerAddress[this.network][dapp];
    const tx = await getPoolTxOrGasEstimate(
      this,
      [txTo, stakeTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Unstake liquidity pool tokens from a yield farm
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Liquidity pool token
   * @param  {BigNumber | string} amount Amount of liquidity pool tokens
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async unStake(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
    const poolId = await this.utils.getLpPoolId(dapp, asset);
    const unStakeTxData = iMiniChefV2.encodeFunctionData(Transaction.WITHDRAW, [
      poolId,
      amount,
      this.address
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [stakingAddress[this.network][dapp], unStakeTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Unstake liquidity pool tokens from Velodrome or Balancer gauge
   * @param {string} gauge Gauge contract address
   * @param {BigNumber | string} amount Amount of liquidity pool tokens or CL token ID
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async unstakeFromGauge(
    gauge: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    let unstakeTxData;
    const rewardsGauge = new ethers.utils.Interface(IBalancerRewardsGauge.abi);
    if (
      gauge.toLowerCase() ===
      stakingAddress[this.network][Dapp.PANCAKECL]?.toLowerCase()
    ) {
      unstakeTxData = getPancakeUnStakeTxData(this, amount.toString());
    } else {
      unstakeTxData = rewardsGauge.encodeFunctionData("withdraw(uint256)", [
        amount
      ]);
    }
    const tx = await getPoolTxOrGasEstimate(
      this,
      [gauge, unstakeTxData, options],
      estimateGas
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
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async lend(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    referralCode = 0,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const depositTxData = iLendingPool.encodeFunctionData(Transaction.DEPOSIT, [
      asset,
      amount,
      this.address,
      referralCode
    ]);

    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][dapp], depositTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Lend asset to a Compound V3 style lending pool
   * @param {string} market Address of market e.g cUSDCv3 address
   * @param {string} asset Asset
   * @param {BigNumber | string} amount Amount of asset to lend
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async lendCompoundV3(
    market: string,
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const supplyTxData = getCompoundV3LendTxData(asset, amount);

    const tx = await getPoolTxOrGasEstimate(
      this,
      [market, supplyTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Witdraw asset from a lending pool
   * @param {Dapp} dapp Platform like Aave
   * @param {string} asset Asset
   * @param  {BigNumber | string} amount Amount of asset to lend
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async withdrawDeposit(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const withdrawTxData = iLendingPool.encodeFunctionData(
      Transaction.WITHDRAW,
      [asset, amount, this.address]
    );

    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][dapp], withdrawTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Witdraw asset from a COmpound V3 style lending pool
   * @param {string} market Address of market e.g cUSDCv3 address
   * @param {string} asset Asset
   * @param  {BigNumber | string} amount Amount of asset to withdraw
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async withdrawCompoundV3(
    market: string,
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const withdrawTxData = getCompoundV3WithdrawTxData(asset, amount);

    const tx = await getPoolTxOrGasEstimate(
      this,
      [market, withdrawTxData, options],
      estimateGas
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
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async borrow(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    referralCode = 0,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const borrowTxData = iLendingPool.encodeFunctionData(Transaction.BORROW, [
      asset,
      amount,
      2,
      referralCode,
      this.address
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][dapp], borrowTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Repays borrowed asset to a lending pool
   * @param {Dapp} dapp Platform like Aave
   * @param {string} asset Asset
   * @param  {BigNumber | string} amount Amount of asset to lend
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async repay(
    dapp: Dapp,
    asset: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iLendingPool = new ethers.utils.Interface(ILendingPool.abi);
    const repayTxData = iLendingPool.encodeFunctionData(Transaction.REPAY, [
      asset,
      amount,
      2,
      this.address
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][dapp], repayTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Claim rewards of staked liquidity pool tokens
   * @param {Dapp} dapp Platform like Sushiswap or Uniswap
   * @param {string} asset Liquidity pool token
   * @param {any} options Transaction option
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async harvestRewards(
    dapp: Dapp,
    asset: string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);
    const poolId = await this.utils.getLpPoolId(dapp, asset);
    const harvestTxData = iMiniChefV2.encodeFunctionData(Transaction.HARVEST, [
      poolId,
      this.address
    ]);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [stakingAddress[this.network][dapp], harvestTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Change enabled pool assets
   * @param {AssetEnabled[]} assets New pool assets
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  public async changeAssets(
    assets: AssetEnabled[],
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const currentAssetsEnabled = await this.getComposition();
    const currentAssets = currentAssetsEnabled.map(e =>
      e.asset.toLocaleLowerCase()
    );
    const newAssets = assets.map(e => e.asset.toLocaleLowerCase());
    const removedAssets = currentAssets.filter(e => !newAssets.includes(e));
    const changedAssets = assets.map(e => [e.asset, e.isDeposit]);

    if (estimateGas) {
      return await this.managerLogic.estimateGas.changeAssets(
        changedAssets,
        removedAssets,
        options
      );
    }
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
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async setTrader(
    trader: string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    if (estimateGas) {
      return await this.managerLogic.estimateGas.setTrader(trader, options);
    }
    const tx = await this.managerLogic.setTrader(trader, options);
    return tx;
  }

  /**
   * Invest into a Balancer pool
   * @param {string} poolId Balancer pool id
   * @param {string[] | } assetsIn Array of balancer pool assets
   * @param {BigNumber[] | string[]} amountsIn Array of maximum amounts to provide to pool
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async joinBalancerPool(
    poolId: string,
    assets: string[],
    amountsIn: string[] | BigNumber[],
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const joinPoolTxData = this.utils.getBalancerJoinPoolTx(
      this,
      poolId,
      assets,
      amountsIn
    );
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][Dapp.BALANCER], joinPoolTxData, options],
      estimateGas
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
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async exitBalancerPool(
    poolId: string,
    assets: string[],
    amount: string | BigNumber,
    singleExitAssetIndex: number | null = null,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const exitPoolTxData = this.utils.getBalancerExitPoolTx(
      this,
      poolId,
      assets,
      singleExitAssetIndex,
      amount
    );
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][Dapp.BALANCER], exitPoolTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Claim rewards from Aave platform
   * @param {string[]} assets Aave tokens (deposit/debt) hold by pool
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async harvestAaveRewards(
    assets: string[],
    options: any = null,
    estimateGas = false
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
    const tx = await getPoolTxOrGasEstimate(
      this,
      [aaveIncentivesAddress, claimTxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Claim rewards from Aave platform
   * @param {string[]} assets Assets invested in Aave
   * @param {string} rewardAssets Reward token address
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async harvestAaveV3Rewards(
    assets: string[],
    rewardAsset: string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const claimTxData = await getAaveV3ClaimTxData(this, assets, rewardAsset);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [
        stakingAddress[this.network][Dapp.AAVEV3] as string,
        claimTxData,
        options
      ],
      estimateGas
    );
    return tx;
  }

  /**
   * Create UniswapV3 liquidity pool
   * @param {dapp} Platform UniswapV3, VelodromeCL, AerodromeCL or RamesesCL
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amountA Amount first asset
   * @param {BigNumber | string} amountB Amount second asset
   * @param { number } minPrice Lower price range (assetB per assetA)
   * @param { number } maxPrice Upper price range (assetB per assetA)
   * @param { number } minTick Lower tick range
   * @param { number } maxTick Upper tick range
   * @param { number } feeAmountOrTickSpacing Fee tier UniswapV3 or tick spacing VelodromeCL
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async addLiquidityUniswapV3(
    dapp:
      | Dapp.UNISWAPV3
      | Dapp.VELODROMECL
      | Dapp.AERODROMECL
      | Dapp.RAMSESCL
      | Dapp.PANCAKECL,
    assetA: string,
    assetB: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string,
    minPrice: number | null,
    maxPrice: number | null,
    minTick: number | null,
    maxTick: number | null,
    feeAmountOrTickSpacing: number,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    if (
      (minPrice === null || maxPrice === null) &&
      (minTick === null || maxTick === null)
    )
      throw new Error("Need to provide price or tick range");
    if ((minPrice || maxPrice) && dapp !== Dapp.UNISWAPV3)
      throw new Error("no price conversion for Aerodrome/Velodrome CL");

    const mintTxData = await getUniswapV3MintTxData(
      dapp,
      this,
      assetA,
      assetB,
      amountA,
      amountB,
      minPrice,
      maxPrice,
      minTick,
      maxTick,
      feeAmountOrTickSpacing
    );

    const tx = await getPoolTxOrGasEstimate(
      this,
      [
        nonfungiblePositionManagerAddress[this.network][dapp],
        mintTxData,
        options
      ],
      estimateGas
    );
    return tx;
  }

  /**
   * Remove liquidity from an UniswapV3 or Arrakis liquidity pool
   * @param {Dapp} dapp Platform either UniswapV3 or Arrakis
   * @param {string} tokenId Token Id of UniswapV3 position
   * @param {number} amount Amount in percent of assets to be removed
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async decreaseLiquidity(
    dapp: Dapp,
    tokenId: string,
    amount = 100,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    let dappAddress;
    let isStaked = false;
    let txData;
    switch (dapp) {
      case Dapp.UNISWAPV3:
      case Dapp.RAMSESCL:
        dappAddress = nonfungiblePositionManagerAddress[this.network][dapp];
        break;
      case Dapp.VELODROMECL:
      case Dapp.AERODROMECL:
      case Dapp.PANCAKECL:
        const tokenIdOwner = await getClOwner(this, dapp, tokenId);
        if (tokenIdOwner.toLowerCase() === this.address.toLowerCase()) {
          dappAddress = nonfungiblePositionManagerAddress[this.network][dapp];
        } else {
          //staked in gauge
          dappAddress = tokenIdOwner;
          isStaked = true;
        }
        break;
      case Dapp.ARRAKIS:
        dappAddress = routerAddress[this.network][dapp];
        break;
      default:
        throw new Error("dapp not supported");
    }
    if (!isStaked || dapp === Dapp.PANCAKECL) {
      txData = await getDecreaseLiquidityTxData(
        this,
        dapp,
        tokenId,
        amount,
        isStaked
      );
    } else {
      throw new Error(
        "unsupported decreaseStakedLiquidity: unstake first to decrease lp"
      );
    }
    const tx = await getPoolTxOrGasEstimate(
      this,
      [dappAddress, txData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Increase liquidity of an UniswapV, VelodromeCL or Arrakis liquidity pool
   * @param {Dapp} dapp Platform either UniswapV3 or Arrakis
   * @param {string} tokenId Token Id of UniswapV3 position
   * @param {BigNumber | string} amountA Amount first asset
   * @param {BigNumber | string} amountB Amount second asset
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async increaseLiquidity(
    dapp: Dapp,
    tokenId: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    let dappAddress;
    let isStaked = false;
    let txData;
    switch (dapp) {
      case Dapp.UNISWAPV3:
      case Dapp.RAMSESCL:
        dappAddress = nonfungiblePositionManagerAddress[this.network][dapp];
        break;
      case Dapp.VELODROMECL:
      case Dapp.AERODROMECL:
      case Dapp.PANCAKECL:
        const tokenIdOwner = await getClOwner(this, dapp, tokenId);
        if (tokenIdOwner.toLowerCase() === this.address.toLowerCase()) {
          dappAddress = nonfungiblePositionManagerAddress[this.network][dapp];
        } else {
          //staked in gauge
          dappAddress = tokenIdOwner;
          isStaked = true;
        }
        break;
      case Dapp.ARRAKIS:
        dappAddress = routerAddress[this.network][dapp];
        break;
      default:
        throw new Error("dapp not supported");
    }
    //PancakeCL supports increase liquidity to staked position
    if (!isStaked || dapp === Dapp.PANCAKECL) {
      txData = await getIncreaseLiquidityTxData(
        this,
        dapp,
        tokenId,
        amountA,
        amountB
      );
    } else {
      throw new Error(
        "unsupported increaseStakedLiquidity: unstake first to increase lp"
      );
    }
    const tx = await getPoolTxOrGasEstimate(
      this,
      [dappAddress, txData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Claim fees of an UniswapV3 liquidity or Arrakis pool
   * @param {Dapp} dapp Platform either UniswapV3 or Arrakis
   * @param {string} tokenId Token Id of UniswapV3 or Gauge address
   * @param {any} options Transaction option
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async claimFees(
    dapp: Dapp,
    tokenId: string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    let txData;
    let contractAddress;
    const iNonfungiblePositionManager = new ethers.utils.Interface(
      INonfungiblePositionManager.abi
    );
    switch (dapp) {
      case Dapp.UNISWAPV3:
      case Dapp.RAMSESCL:
        contractAddress = nonfungiblePositionManagerAddress[this.network][dapp];
        txData = iNonfungiblePositionManager.encodeFunctionData(
          Transaction.COLLECT,
          [[tokenId, this.address, MaxUint128, MaxUint128]]
        );
        break;
      case Dapp.ARRAKIS:
      case Dapp.BALANCER:
        contractAddress = tokenId;
        const abi = new ethers.utils.Interface(ILiquidityGaugeV4.abi);
        txData = abi.encodeFunctionData("claim_rewards()", []);
        break;
      case Dapp.VELODROME:
      case Dapp.RAMSES:
        contractAddress = tokenId;
        txData = getVelodromeClaimTxData(this, tokenId, false);
        break;
      case Dapp.VELODROMEV2:
      case Dapp.AERODROME:
        contractAddress = tokenId;
        txData = getVelodromeClaimTxData(this, tokenId, true);
        break;
      case Dapp.VELODROMECL:
      case Dapp.AERODROMECL:
      case Dapp.PANCAKECL:
        const tokenIdOwner = await getClOwner(this, dapp, tokenId);
        if (tokenIdOwner.toLowerCase() === this.address.toLowerCase()) {
          contractAddress =
            nonfungiblePositionManagerAddress[this.network][dapp];
          txData = iNonfungiblePositionManager.encodeFunctionData(
            Transaction.COLLECT,
            [[tokenId, this.address, MaxUint128, MaxUint128]]
          );
        } else {
          //staked in gauge or pancake masterchef
          contractAddress = tokenIdOwner;
          if (dapp === Dapp.PANCAKECL) {
            txData = iNonfungiblePositionManager.encodeFunctionData(
              Transaction.COLLECT,
              [[tokenId, this.address, MaxUint128, MaxUint128]]
            );
          } else {
            txData = getVelodromeCLClaimTxData(tokenId);
          }
        }
        break;
      default:
        throw new Error("dapp not supported");
    }
    const tx = await getPoolTxOrGasEstimate(
      this,
      [contractAddress, txData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Get rewards of an NFT position
   * @param {Dapp} dapp Platform e.g. Ramses CL
   * @param {string} tokenId Token Id
   * @param {string[]} rewards Reward tokens
   * @param {any} options Transaction option
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async getRewards(
    dapp: Dapp,
    tokenId: string,
    rewards: string[],
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await getPoolTxOrGasEstimate(
      this,
      [
        nonfungiblePositionManagerAddress[this.network][dapp],
        getRewardsTxDta(tokenId, rewards),
        options
      ],
      estimateGas
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
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async tradeUniswapV3(
    assetFrom: string,
    assetTo: string,
    amountIn: BigNumber | string,
    feeAmount: number,
    slippage = 0.5,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const swapxData = await getUniswapV3SwapTxData(
      this,
      assetFrom,
      assetTo,
      amountIn,
      slippage,
      feeAmount
    );
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][Dapp.UNISWAPV3], swapxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Add liquidity to Velodrome pool
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amountA Amount first asset
   * @param {BigNumber | string} amountB Amount second asset
   * @param { boolean } isStable Is stable pool
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async addLiquidityVelodrome(
    assetA: string,
    assetB: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string,
    isStable: boolean,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await getPoolTxOrGasEstimate(
      this,
      [
        routerAddress[this.network][Dapp.VELODROME],
        await getVelodromeAddLiquidityTxData(
          this,
          assetA,
          assetB,
          amountA,
          amountB,
          isStable
        ),
        options
      ],
      estimateGas
    );
    return tx;
  }

  /**
   * Remove liquidity from Velodrome pool
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amount Amount of LP tokens
   * @param { boolean } isStable Is stable pool
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async removeLiquidityVelodrome(
    assetA: string,
    assetB: string,
    amount: BigNumber | string,
    isStable: boolean,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await getPoolTxOrGasEstimate(
      this,
      [
        routerAddress[this.network][Dapp.VELODROME],
        await getVelodromeRemoveLiquidityTxData(
          this,
          assetA,
          assetB,
          amount,
          isStable
        ),
        options
      ],
      estimateGas
    );
    return tx;
  }

  /**
   * Add liquidity to Velodrome V2 pool
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amountA Amount first asset
   * @param {BigNumber | string} amountB Amount second asset
   * @param { boolean } isStable Is stable pool
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async addLiquidityVelodromeV2(
    assetA: string,
    assetB: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string,
    isStable: boolean,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await getPoolTxOrGasEstimate(
      this,
      [
        routerAddress[this.network][Dapp.VELODROMEV2],
        await getVelodromeAddLiquidityTxData(
          this,
          assetA,
          assetB,
          amountA,
          amountB,
          isStable
        ),
        options
      ],
      estimateGas
    );
    return tx;
  }

  /**
   * Remove liquidity from Velodrome V2 pool
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amount Amount of LP tokens
   * @param { boolean } isStable Is stable pool
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async removeLiquidityVelodromeV2(
    assetA: string,
    assetB: string,
    amount: BigNumber | string,
    isStable: boolean,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await getPoolTxOrGasEstimate(
      this,
      [
        routerAddress[this.network][Dapp.VELODROMEV2],
        await getVelodromeRemoveLiquidityTxData(
          this,
          assetA,
          assetB,
          amount,
          isStable
        ),
        options
      ],
      estimateGas
    );
    return tx;
  }

  /**
   * Add liquidity to Velodrome V2 or Ramses pool
   * @param {Dapp} dapp VelodromeV2, Ramses or Aerodrome
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amountA Amount first asset
   * @param {BigNumber | string} amountB Amount second asset
   * @param { boolean } isStable Is stable pool
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async addLiquidityV2(
    dapp: Dapp.VELODROMEV2 | Dapp.RAMSES | Dapp.AERODROME,
    assetA: string,
    assetB: string,
    amountA: BigNumber | string,
    amountB: BigNumber | string,
    isStable: boolean,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await getPoolTxOrGasEstimate(
      this,
      [
        routerAddress[this.network][dapp],
        await getVelodromeAddLiquidityTxData(
          this,
          assetA,
          assetB,
          amountA,
          amountB,
          isStable
        ),
        options
      ],
      estimateGas
    );
    return tx;
  }

  /**
   * Remove liquidity from Velodrome V2 or Ramses pool
   * @param {Dapp} dapp VelodromeV2, Ramses or Aerodrome
   * @param {string} assetA First asset
   * @param {string} assetB Second asset
   * @param {BigNumber | string} amount Amount of LP tokens
   * @param { boolean } isStable Is stable pool
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async removeLiquidityV2(
    dapp: Dapp.VELODROMEV2 | Dapp.RAMSES | Dapp.AERODROME,
    assetA: string,
    assetB: string,
    amount: BigNumber | string,
    isStable: boolean,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await getPoolTxOrGasEstimate(
      this,
      [
        routerAddress[this.network][dapp],
        await getVelodromeRemoveLiquidityTxData(
          this,
          assetA,
          assetB,
          amount,
          isStable
        ),
        options
      ],
      estimateGas
    );
    return tx;
  }

  /**
   * Trade options on lyra
   * @param {LyraOptionMarket} market Underlying market e.g. eth
   * @param {number} expiry Expiry timestamp
   * @param { number} strike Strike price
   * @param {LyraOptionType} optionType Call or put
   * @param { LyraTradeType} tradeType By or sell
   * @param {BigNumber | string } optionAmount Option amount
   * @param {string } assetIn  Asset to invest
   * @param {BigNumber | string } collateralChangeAmount Collateral amount to add when shorting options and to remove when covering shorts
   * @param {boolean} isCoveredCall Selling covered call options
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async tradeLyraOption(
    market: LyraOptionMarket,
    expiry: number,
    strike: number,
    optionType: LyraOptionType,
    tradeType: LyraTradeType,
    optionAmount: BigNumber | string,
    assetIn: string,
    collateralChangeAmount: BigNumber | string = "0",
    isCoveredCall = false,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const swapxData = await getLyraOptionTxData(
      this,
      market,
      optionType,
      expiry,
      strike,
      tradeType,
      optionAmount,
      assetIn,
      BigNumber.from(collateralChangeAmount),
      isCoveredCall
    );
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network][Dapp.LYRA], swapxData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * Gets Lyra option positions
   * @returns {Promise<Position>} Transaction
   */
  async getLyraPositions(market: LyraOptionMarket): Promise<LyraPosition[]> {
    return await getOptionPositions(this, market);
  }

  /** Deposit or withdraws (negative amount) asset for Synthetix future margin trading
   *
   * @param {string} market Address of futures market
   * @param {BigNumber | string } changeAmount Amount to increase/decrease margin
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async changeFuturesMargin(
    market: string,
    changeAmount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await getPoolTxOrGasEstimate(
      this,
      [market, getFuturesChangeMarginTxData(changeAmount), options],
      estimateGas
    );
    return tx;
  }

  /** Change position in Synthetix futures market (long/short)
   *
   * @param {string} market Address of futures market
   * @param {BigNumber | string } changeAmount Negative for short, positive for long
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async changeFuturesPosition(
    market: string,
    changeAmount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const txData = await getFuturesChangePositionTxData(
      changeAmount,
      market,
      this
    );
    const tx = await getPoolTxOrGasEstimate(
      this,
      [market, txData, options],
      estimateGas
    );
    return tx;
  }

  /** Cancels an open oder on Synthetix futures market
   *
   * @param {string} market Address of futures market
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async cancelFuturesOrder(
    market: string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const txData = await getFuturesCancelOrderTxData(this);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [market, txData, options],
      estimateGas
    );
    return tx;
  }

  /**
   * mintManagerFee
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async mintManagerFee(options: any = null, estimateGas = false): Promise<any> {
    if (estimateGas) {
      return await this.poolLogic.estimateGas.mintManagerFee(options);
    }
    const tx = await this.poolLogic.mintManagerFee(options);
    return tx;
  }

  /**
   * getAvailableManagerFee
   * @returns {Promise<BigNumber>} fee
   */
  async getAvailableManagerFee(): Promise<BigNumber> {
    const fee = await this.poolLogic.availableManagerFee();
    return BigNumber.from(fee);
  }

  /** Vest tokens (e.g. Ramses xoRAM)
   *
   * @param {string} tokenAddress Address of the token to vest
   * @param {BigNumber | string } changeAmount Negative for short, positive for long
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async vestTokens(
    tokenAddress: string,
    amount: BigNumber | string,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const txData = await getCreateVestTxData(amount);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [tokenAddress, txData, options],
      estimateGas
    );
    return tx;
  }

  /** Exit position of vested tokens (e.g. Ramses xoRAM)
   *
   * @param {string} tokenAddress Address of the token to vest
   * @param {number } id position Id of the vested tokens
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async exitVestedToken(
    tokenAddress: string,
    id: number,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const txData = await getExitVestTxData(id);
    const tx = await getPoolTxOrGasEstimate(
      this,
      [tokenAddress, txData, options],
      estimateGas
    );
    return tx;
  }

  /** deposit rETH to mint UNIT via the Flat Money protocol
   *
   * @param { BigNumber | string } depositAmount Amount of rETH to deposit
   * @param { number } slippage slippage, 0.5 represents 0.5%
   * @param { number | null } maxKeeperFeeInUsd 5 represents $5; null will skip the maxKeeperFee check
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async mintUnitViaFlatMoney(
    depositAmount: ethers.BigNumber | string,
    slippage = 0.5,
    maxKeeperFeeInUsd: number | null,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await mintUnitViaFlatMoney(
      this,
      depositAmount,
      slippage,
      maxKeeperFeeInUsd,
      options,
      estimateGas
    );
    return tx;
  }

  /** redeem UNIT via the Flat Money protocol
   *
   * @param { BigNumber | string } depositAmount Amount of UNIT to withdraw
   * @param { number } slippage slippage, 0.5 represents 0.5%
   * @param { number | null } maxKeeperFeeInUsd 5 represents $5; null will skip the maxKeeperFee check
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async redeemUnitViaFlatMoney(
    withdrawAmount: ethers.BigNumber | string,
    slippage = 0.5,
    maxKeeperFeeInUsd: number | null,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await redeemUnitViaFlatMoney(
      this,
      withdrawAmount,
      slippage,
      maxKeeperFeeInUsd,
      options,
      estimateGas
    );
    return tx;
  }

  async cancelOrderViaFlatMoney(
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const tx = await cancelOrderViaFlatMoney(this, options, estimateGas);
    return tx;
  }

  /**
   * Complete a Toros withdrawal to a single asset
   * @param {string} destinationToken Address of destination asset
   * @param {number} slippage Slippage tolerance in %
   * @param {any} options Transaction options
   * @param {boolean} estimateGas Simulate/estimate gas
   * @returns {Promise<any>} Transaction
   */
  async completeTorosWithdrawal(
    destinationToken: string,
    slippage = 0.5,
    options: any = null,
    estimateGas = false
  ): Promise<any> {
    const txData = await getCompleteWithdrawalTxData(
      this,
      destinationToken,
      slippage
    );
    const tx = await getPoolTxOrGasEstimate(
      this,
      [routerAddress[this.network].toros, txData, options],
      estimateGas
    );
    return tx;
  }
}
