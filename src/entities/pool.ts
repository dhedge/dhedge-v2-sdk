import { Contract, ethers, Wallet } from "ethers";

import IUniswapV2Router from "../abi/IUniswapV2Router.json";
import PoolLogic from "../abi/PoolLogic.json";
import ManagerLogic from "../abi/PoolManagerLogic.json";
import { walletConfig, routerAddress } from "../config";
import { Dapp, Transaction, FundComposition, AssetEnabled } from "../types";

export class Pool {
  public readonly poolLogic: Contract;
  public readonly managerLogic: Contract;
  public signer: Wallet;
  public address: string;

  public constructor(
    signer: Wallet,
    poolLogic: Contract,
    mangerLogic: Contract
  ) {
    this.poolLogic = poolLogic;
    this.address = poolLogic.address;
    this.managerLogic = mangerLogic;
    this.signer = signer;
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
      routerAddress[walletConfig.network][dapp],
      swapTxData
    );

    return tx.hash;
  }

  // async addLiquidity(
  //   dapp: Dapp,
  //   assetA: string,
  //   assetB: string,
  //   amountA: string
  //   amountB: string
  // ): Promise<string> {
  //   const iUniswapV2Router = new ethers.utils.Interface(IUniswapV2Router.abi);
  //   const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
  //   const swapTxData = iUniswapV2Router.encodeFunctionData(Transaction.SWAP, [
  //     amount,
  //     0,
  //     [assetFrom, assetTo],
  //     this.address,
  //     deadline
  //   ]);

  //   const tx = await this.poolLogic.execTransaction(
  //     routerAddress[walletConfig.network][dapp],
  //     swapTxData
  //   );

  //   return tx.hash;
  // }

  public async getComposition(address: string): Promise<FundComposition[]> {
    const poolLogic = new Contract(address, PoolLogic.abi, this.signer);
    const managerLogicAddress = await poolLogic.poolManagerLogic();
    const managerLogic = new Contract(
      managerLogicAddress,
      ManagerLogic.abi,
      this.signer
    );

    let composition = {} as any;
    let result = await managerLogic.getFundComposition();

    let fundComposition = result[0].map((item: AssetEnabled, index: string | number) => {
      const { asset, isDeposit } = item;
      return composition[asset] = {
        asset: asset,
        isDeposit: isDeposit,
        balance: result[1][index],
        rate: result[2][index] 
      }
    })
    return fundComposition;
  }
}
