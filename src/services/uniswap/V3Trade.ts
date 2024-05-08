import { ethers } from "ethers";
import { Pool } from "../..";

import IUniswapV3Router from "../../abi/IUniswapV3Router.json";
import IUniswapV3Quoter from "../../abi/IUniswapV3Quoter.json";
import { UNISWAPV3_QUOTER_ADDRESS } from "../../config";

export async function getUniswapV3SwapTxData(
  pool: Pool,
  assetA: string,
  assetB: string,
  amountIn: string | ethers.BigNumber,
  slippage: number,
  feeAmount: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const quoterContract = new ethers.Contract(
    UNISWAPV3_QUOTER_ADDRESS,
    IUniswapV3Quoter.abi,
    pool.signer
  );

  const quotedAmountOut: ethers.BigNumber = await quoterContract.callStatic.quoteExactInputSingle(
    assetA,
    assetB,
    feeAmount,
    amountIn.toString(),
    0
  );

  const minAmountOut = quotedAmountOut.mul((100 - slippage) * 100).div(10000);

  const iUniswapV3Router = new ethers.utils.Interface(IUniswapV3Router.abi);
  const swapTx = iUniswapV3Router.encodeFunctionData("exactInputSingle", [
    [
      assetA,
      assetB,
      feeAmount,
      pool.address,
      amountIn.toString(),
      minAmountOut.toString(),
      0
    ]
  ]);
  return swapTx;
}
