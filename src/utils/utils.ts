import { Contract, Wallet } from "ethers";

import UniswapV2Factory from "../abi/IUniswapV2Factory.json";
import UniswapV2Pair from "../abi/IUniswapV2Pair.json";
import { dappFactoryAddress, walletConfig } from "../config";
import { Dapp } from "../types";

/**
 * Returns the amount of the other token that need to be provided to aliquidity pool
 * given the amount of one token
 * @param dApp dApp like uniswap or sushiswap
 * @param tokenA first token of the pool pair
 * @param tokenB second token of the pool pair
 * @param amountA given amount of the firt token
 * @throws if the dapp is not supported on the network
 */

export async function calculateLpAmount(
  dapp: Dapp,
  tokenA: string,
  tokenB: string,
  amountA: string,
  signer: Wallet
): Promise<string> {
  if (dappFactoryAddress[walletConfig.network][dapp]) {
    const uniswapV2Factory = new Contract(
      dappFactoryAddress[walletConfig.network][dapp] as string,
      UniswapV2Factory.abi,
      signer
    );

    const uniswapV2PairAddress = await uniswapV2Factory.getPair(tokenA, tokenB);

    const uniswapV2Pair = new Contract(
      uniswapV2PairAddress,
      UniswapV2Pair.abi,
      signer
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
