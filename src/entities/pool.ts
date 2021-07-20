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

  async approve(dapp: Dapp, asset: string, staking = false): Promise<string> {
    const iERC20 = new ethers.utils.Interface(IERC20.abi);
    const approver = staking
      ? stakingAddress[this.network][dapp]
      : routerAddress[this.network][dapp];
    const approveTxData = iERC20.encodeFunctionData("approve", [
      approver,
      ethers.constants.MaxUint256
    ]);

    const tx = await this.poolLogic.execTransaction(asset, approveTxData);

    return tx.hash;
  }

  async approveDeposit(asset: string): Promise<string> {
    const iERC20 = new ethers.Contract(asset, IERC20.abi, this.signer);
    const balance = await iERC20.balanceOf(this.signer.getAddress());
    const tx = await iERC20.approve(this.address, balance);

    return tx.hash;
  }

  async trade(
    dapp: Dapp,
    assetFrom: string,
    assetTo: string,
    amount: string
  ): Promise<string> {
    const iUniswapV2Router = new ethers.utils.Interface(IUniswapV2Router.abi);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
    const swapTxData = iUniswapV2Router.encodeFunctionData(Transaction.SWAP, [
      amount,
      0,
      [assetFrom, assetTo],
      this.address,
      deadline
    ]);

    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      swapTxData
    );

    return tx.hash;
  }

  async addLiquidity(
    dapp: Dapp,
    assetA: string,
    assetB: string,
    amountA: string,
    amountB: string
  ): Promise<string> {
    const iUniswapV2Router = new ethers.utils.Interface(IUniswapV2Router.abi);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time

    const addLiquidityTxData = iUniswapV2Router.encodeFunctionData(
      Transaction.ADD_LIQUIDITY,
      [assetA, assetB, amountA, amountB, 0, 0, this.address, deadline]
    );

    const tx = await this.poolLogic.execTransaction(
      routerAddress[this.network][dapp],
      addLiquidityTxData
    );

    return tx.hash;
  }

  async stake(dapp: Dapp, asset: string, amount: string): Promise<string> {
    const iMiniChefV2 = new ethers.utils.Interface(IMiniChefV2.abi);

    //to do: get LP pool id from asset
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

    return tx.hash;
  }

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

  public async changeAssets(
    assets: AssetEnabled[]
  ): Promise<FundComposition[]> {
    let currentAssetsEnabled = await this.getComposition();
    const currentAssets = currentAssetsEnabled.map(e =>
      e.asset.toLocaleLowerCase()
    );
    const newAssets = assets.map(e => e.asset.toLocaleLowerCase());
    const removedAssets = currentAssets.filter(e => !newAssets.includes(e));
    const changedAssets = assets.map(e => [e.asset, e.isDeposit]);
    const receipt = await this.managerLogic.changeAssets(
      changedAssets,
      removedAssets
    );

    await receipt.wait(1);

    currentAssetsEnabled = await this.getComposition();
    return currentAssetsEnabled;
  }

  async deposit(asset: string, amount: string | number): Promise<string> {
    if (!BigNumber.isBigNumber(amount) && typeof amount !== "string") {
      throw new Error(
        "Please pass numbers as strings or BigNumber objects to avoid precision errors."
      );
    }

    const depositAmount = ethers.BigNumber.from(amount);
    const tx = await this.poolLogic.deposit(asset, depositAmount);

    await tx.wait(1);

    return tx.hash;
  }
}
