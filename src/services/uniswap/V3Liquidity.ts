/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Price, Token } from "@uniswap/sdk-core";
import {
  encodeSqrtRatioX96,
  nearestUsableTick,
  priceToClosestTick,
  TICK_SPACINGS,
  TickMath
} from "@uniswap/v3-sdk";
import { ethers } from "ethers";
import JSBI from "jsbi";
import { Dapp, Pool, Transaction } from "../..";
import {
  MaxUint128,
  networkChainIdMap,
  nonfungiblePositionManagerAddress
} from "../../config";
import INonfungiblePositionManager from "../../abi/INonfungiblePositionManager.json";
import IVeldodromePositionManager from "../../abi/IVelodromeNonfungiblePositionManager.json";
import IArrakisV1RouterStaking from "../../abi/IArrakisV1RouterStaking.json";
import { getDeadline } from "../../utils/deadline";
import BigNumber from "bignumber.js";

export function tryParsePrice(
  baseToken: Token,
  quoteToken: Token,
  value: string
): Price<Token, Token> {
  const [whole, fraction] = value.split(".");

  const decimals = fraction?.length ?? 0;
  const withoutDecimals = JSBI.BigInt((whole ?? "") + (fraction ?? ""));

  return new Price(
    baseToken,
    quoteToken,
    JSBI.multiply(
      JSBI.BigInt(10 ** decimals),
      JSBI.BigInt(10 ** baseToken.decimals)
    ),
    JSBI.multiply(withoutDecimals, JSBI.BigInt(10 ** quoteToken.decimals))
  );
}

export function tryParseTick(
  baseToken: Token,
  quoteToken: Token,
  feeAmount: number,
  value: string
): number {
  const price = tryParsePrice(baseToken, quoteToken, value);

  let tick: number;

  // check price is within min/max bounds, if outside return min/max
  const sqrtRatioX96 = encodeSqrtRatioX96(price.numerator, price.denominator);

  if (JSBI.greaterThanOrEqual(sqrtRatioX96, TickMath.MAX_SQRT_RATIO)) {
    tick = TickMath.MAX_TICK;
  } else if (JSBI.lessThanOrEqual(sqrtRatioX96, TickMath.MIN_SQRT_RATIO)) {
    tick = TickMath.MIN_TICK;
  } else {
    // this function is agnostic to the base, will always return the correct tick
    tick = priceToClosestTick(price);
  }

  return nearestUsableTick(tick, TICK_SPACINGS[feeAmount]);
}

export async function getUniswapV3MintTxData(
  dapp: Dapp.UNISWAPV3 | Dapp.VELODROMECL,
  pool: Pool,
  assetA: string,
  assetB: string,
  amountA: string | ethers.BigNumber,
  amountB: string | ethers.BigNumber,
  minPrice: number | null,
  maxPrice: number | null,
  minTick: number | null,
  maxTick: number | null,
  feeAmount: number
): Promise<any> {
  let tickLower = 0;
  let tickUpper = 0;
  const chainId = networkChainIdMap[pool.network];
  const decimals = await Promise.all(
    [assetA, assetB].map(asset => pool.utils.getDecimals(asset))
  );
  const tokenA = new Token(chainId, assetA, decimals[0]);
  const tokenB = new Token(chainId, assetB, decimals[1]);
  const [token0, token1] = tokenA.sortsBefore(tokenB)
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
  const invertPrice = !tokenA.equals(token0);
  if (minPrice && maxPrice) {
    tickLower = invertPrice
      ? tryParseTick(token1, token0, feeAmount, maxPrice.toString())
      : tryParseTick(token0, token1, feeAmount, minPrice.toString());
    tickUpper = invertPrice
      ? tryParseTick(token1, token0, feeAmount, minPrice.toString())
      : tryParseTick(token0, token1, feeAmount, maxPrice.toString());
  } else if (minTick && maxTick) {
    tickLower = minTick;
    tickUpper = maxTick;
  }
  const [amount0, amount1] = invertPrice
    ? [amountB, amountA]
    : [amountA, amountB];

  const mintParams = [
    token0.address,
    token1.address,
    feeAmount,
    tickLower,
    tickUpper,
    amount0,
    amount1,
    "0",
    "0",
    pool.address,
    await getDeadline(pool)
  ];

  let iNonfungiblePositionManager = new ethers.utils.Interface(
    INonfungiblePositionManager.abi
  );

  if (dapp === Dapp.VELODROMECL) {
    iNonfungiblePositionManager = new ethers.utils.Interface(
      IVeldodromePositionManager.abi
    );
    mintParams.push(0);
  }

  return iNonfungiblePositionManager.encodeFunctionData(Transaction.MINT, [
    mintParams
  ]);

  return;
}

export async function getUniswapV3Liquidity(
  dapp: Dapp.UNISWAPV3 | Dapp.VELODROMECL,
  tokenId: string,
  pool: Pool
): Promise<BigNumber> {
  const iNonfungiblePositionManager = new ethers.Contract(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    nonfungiblePositionManagerAddress[pool.network][dapp]!,
    INonfungiblePositionManager.abi,
    pool.signer
  );
  const result = await iNonfungiblePositionManager.positions(tokenId);
  return new BigNumber(result.liquidity.toString());
}

export async function getIncreaseLiquidityTxData(
  pool: Pool,
  dapp: Dapp,
  tokenId: string,
  amountA: ethers.BigNumber | string,
  amountB: ethers.BigNumber | string
): Promise<any> {
  let txData;
  if (dapp === Dapp.UNISWAPV3 || dapp === Dapp.VELODROMECL) {
    const abi = new ethers.utils.Interface(INonfungiblePositionManager.abi);
    txData = abi.encodeFunctionData(Transaction.INCREASE_LIQUIDITY, [
      [tokenId, amountA, amountB, 0, 0, await getDeadline(pool)]
    ]);
  } else if (dapp === Dapp.ARRAKIS) {
    const abi = new ethers.utils.Interface(IArrakisV1RouterStaking.abi);
    txData = abi.encodeFunctionData(Transaction.ADD_LIQUIDITY_STAKE, [
      tokenId,
      amountA,
      amountB,
      0,
      0,
      0,
      pool.address
    ]);
  } else {
    throw new Error("dapp not supported");
  }

  return txData;
}

export async function getDecreaseLiquidityTxData(
  pool: Pool,
  dapp: Dapp,
  tokenId: string,
  amount = 100
): Promise<any> {
  let txData;
  if (dapp === Dapp.UNISWAPV3 || dapp === Dapp.VELODROMECL) {
    const abi = new ethers.utils.Interface(INonfungiblePositionManager.abi);
    const liquidity = (await getUniswapV3Liquidity(dapp, tokenId, pool))
      .times(amount)
      .div(100);

    const decreaseLiquidityTxData = abi.encodeFunctionData(
      Transaction.DECREASE_LIQUIDITY,
      [[tokenId, liquidity.toFixed(0), 0, 0, await getDeadline(pool)]]
    );
    const collectTxData = abi.encodeFunctionData(Transaction.COLLECT, [
      [tokenId, pool.address, MaxUint128, MaxUint128]
    ]);

    const multicallParams = [decreaseLiquidityTxData, collectTxData];

    if (amount === 100) {
      const burnTxData = abi.encodeFunctionData(Transaction.BURN, [tokenId]);
      multicallParams.push(burnTxData);
    }
    txData = abi.encodeFunctionData(Transaction.MULTI_CALL, [multicallParams]);
  } else if (dapp === Dapp.ARRAKIS) {
    const abi = new ethers.utils.Interface(IArrakisV1RouterStaking.abi);
    const liquidity = new BigNumber(
      (await pool.utils.getBalance(tokenId, pool.address)).toString()
    )
      .times(amount)
      .div(100);
    txData = abi.encodeFunctionData(Transaction.REMOVE_LIQUIDITY_UNSTAKE, [
      tokenId,
      liquidity,
      0,
      0,
      pool.address
    ]);
  } else {
    throw new Error("dapp not supported");
  }
  return txData;
}
