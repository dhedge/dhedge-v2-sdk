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
import { Dapp, Pool, Transaction } from "../..";
import {
  networkChainIdMap,
  nonfungiblePositionManagerAddress
} from "../../config";
import INonfungiblePositionManager from "../../abi/INonfungiblePositionManager.json";
import IKyberNonfungiblePositionManager from "../../abi/IKyberNonfungiblePositionManager.json";
import { getKyberPoolAddress } from "./kyberFork";

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

export async function getUniswapV3MintTxData(
  pool: Pool,
  dapp: Dapp,
  assetA: string,
  assetB: string,
  amountA: string | ethers.BigNumber,
  amountB: string | ethers.BigNumber,
  minPrice: number | null,
  maxPrice: number | null,
  minTick: number | null,
  maxTick: number | null,
  feeAmount: FeeAmount
): Promise<string> {
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

  const contract = getKyberPoolAddress(pool.network, tokenA, tokenB, feeAmount);
  console.log("contratc", contract);

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

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  const abi =
    dapp === Dapp.KYBER
      ? IKyberNonfungiblePositionManager.abi
      : INonfungiblePositionManager.abi;
  const iNonfungiblePositionManager = new ethers.utils.Interface(abi);
  let txParams;
  if (dapp == Dapp.KYBER) {
    txParams = [
      token0.address,
      token1.address,
      feeAmount,
      tickLower,
      tickUpper,
      [-410, -409],
      amount0,
      amount1,
      "0",
      "0",
      pool.address,
      deadline
    ];
  } else {
    txParams = [
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
      deadline
    ];
  }
  return iNonfungiblePositionManager.encodeFunctionData(Transaction.MINT, [
    txParams
  ]);
}

export async function getUniswapV3Liquidity(
  dapp: Dapp,
  tokenId: string,
  pool: Pool
): Promise<ethers.BigNumber> {
  const iNonfungiblePositionManager = new ethers.Contract(
    nonfungiblePositionManagerAddress[pool.network][dapp] as string,
    INonfungiblePositionManager.abi,
    pool.signer
  );
  const result = await iNonfungiblePositionManager.positions(tokenId);
  return result.liquidity;
}
