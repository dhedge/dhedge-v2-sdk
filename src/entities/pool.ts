import { Contract, ethers, Wallet } from "ethers";

import IUniswapV2Router from "../abi/IUniswapV2Router.json";
import { walletConfig, routerAddress } from "../config";
import { Dapp, Transaction } from "../types";

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

    // const txFromApp =
    //   "0x38ed173900000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000016b09eef38e0500000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000fb1314b51b4f117c77dd03c3486b4a4f3ee0f25d0000000000000000000000000000000000000000000000000000000060ebe55600000000000000000000000000000000000000000000000000000000000000020000000000000000000000009d4dc547d9c1822aed5b6e19025894d1b7a5403600000000000000000000000021d867e9089d07570c682b9186697e2e326cec8a";

    // const decoded = iUniswapV2Router.decodeFunctionData(
    //   Transaction.SWAP,
    //   txFromApp
    // );

    // console.log("shouldbe", decoded);

    // const decoded2 = iUniswapV2Router.decodeFunctionData(
    //   Transaction.SWAP,
    //   txFromApp
    // );

    // console.log("is", decoded2.deadline.toString().toString());

    // console.log(routerAddress[walletConfig.network][dapp]);

    const tx = await this.poolLogic.execTransaction(
      routerAddress[walletConfig.network][dapp],
      swapTxData
    );

    return tx.hash;
  }
}
