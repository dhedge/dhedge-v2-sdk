import { Price, Token } from "@uniswap/sdk-core";
import {
  encodeSqrtRatioX96,
  FeeAmount,
  nearestUsableTick,
  priceToClosestTick,
  TICK_SPACINGS,
  TickMath
} from "@uniswap/v3-sdk";
import { ethers } from "ethers";
import JSBI from "jsbi";
import { Pool } from "../..";
import {
  networkChainIdMap,
  nonfungiblePositionManagerAddress
} from "../../config";
import { UniswapV3MintParams } from "./types";
import INonfungiblePositionManager from "../../abi/INonfungiblePositionManager.json";
import { getDeadline } from "../../utils/deadline";

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
  feeAmount: FeeAmount,
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

export async function getUniswapV3MintParams(
  pool: Pool,
  assetA: string,
  assetB: string,
  amountA: string | ethers.BigNumber,
  amountB: string | ethers.BigNumber,
  minPrice: number | null,
  maxPrice: number | null,
  minTick: number | null,
  maxTick: number | null,
  feeAmount: FeeAmount
): Promise<UniswapV3MintParams> {
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

  return [
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
}

export async function getUniswapV3Liquidity(
  tokenId: string,
  pool: Pool
): Promise<ethers.BigNumber> {
  const iNonfungiblePositionManager = new ethers.Contract(
    nonfungiblePositionManagerAddress[pool.network],
    INonfungiblePositionManager.abi,
    pool.signer
  );
  const result = await iNonfungiblePositionManager.positions(tokenId);
  return result.liquidity;
}
