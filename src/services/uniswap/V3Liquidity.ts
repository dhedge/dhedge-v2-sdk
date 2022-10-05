/* eslint-disable @typescript-eslint/no-explicit-any */
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
  deadline,
  MaxUint128,
  networkChainIdMap,
  nonfungiblePositionManagerAddress
} from "../../config";
import INonfungiblePositionManager from "../../abi/INonfungiblePositionManager.json";
import IKyberNonfungiblePositionManager from "../../abi/IKyberNonfungiblePositionManager.json";
import { getKyberOwedFees, getKyberPreviousTicks } from "./kyberFork";
import { Interface } from "ethers/lib/utils";

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

  let txParams;
  if (dapp == Dapp.KYBER) {
    const previousTicks = await getKyberPreviousTicks(
      pool,
      tokenA,
      tokenB,
      feeAmount,
      tickLower,
      tickUpper
    );

    txParams = [
      token0.address,
      token1.address,
      feeAmount,
      tickLower,
      tickUpper,
      previousTicks,
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
  return nonfungiblePositionManagerAbi(
    dapp
  ).encodeFunctionData(Transaction.MINT, [txParams]);
}

export async function getUniswapV3Position(
  dapp: Dapp,
  tokenId: string,
  pool: Pool
): Promise<any> {
  const iNonfungiblePositionManager = new ethers.Contract(
    nonfungiblePositionManagerAddress[pool.network][dapp] as string,
    nonfungiblePositionManagerAbi(dapp),
    pool.signer
  );
  return await iNonfungiblePositionManager.positions(tokenId);
}

export async function getUniswapV3DecreaseLiqTxData(
  pool: Pool,
  dapp: Dapp,
  tokenId: string,
  amount = 100
): Promise<string> {
  let multicallParams = [];
  const isKyber = dapp === Dapp.KYBER;
  const iNonfungiblePositionManager = nonfungiblePositionManagerAbi(dapp);

  const position = await getUniswapV3Position(dapp, tokenId, pool);
  const liquidity: ethers.BigNumber = isKyber
    ? position.pos.liquidity
    : position.liquidity;
  const tokenAmount = liquidity.mul(Math.round(amount * 1e4)).div(1e6);
  const decreaseLiquidityTxData = nonfungiblePositionManagerAbi(
    dapp
  ).encodeFunctionData(
    isKyber ? Transaction.REMOVE_LIQUIDITY : Transaction.DECREASE_LIQUIDITY,
    [[tokenId, tokenAmount, 0, 0, deadline]]
  );
  multicallParams.push(decreaseLiquidityTxData);

  if (dapp === Dapp.KYBER) {
    const burnRTokenTxData = iNonfungiblePositionManager.encodeFunctionData(
      "burnRTokens",
      [[tokenId, 0, 0, deadline]]
    );
    multicallParams.push(burnRTokenTxData);
    const { fee, token0, token1 } = position.info;
    const amounts = await getKyberOwedFees(pool, tokenId, token0, token1, fee);
    const transferTxData = [token0, token1].map((token, i) =>
      iNonfungiblePositionManager.encodeFunctionData("transferAllTokens", [
        token,
        amounts[i].toString(),
        pool.address
      ])
    );
    multicallParams = multicallParams.concat(transferTxData);
  } else {
    const collectTxData = iNonfungiblePositionManager.encodeFunctionData(
      Transaction.COLLECT,
      [[tokenId, pool.address, MaxUint128, MaxUint128]]
    );
    multicallParams.push(collectTxData);
    if (amount === 100) {
      const burnTxData = iNonfungiblePositionManager.encodeFunctionData(
        Transaction.BURN,
        [tokenId]
      );
      multicallParams.push(burnTxData);
    }
  }
  return iNonfungiblePositionManager.encodeFunctionData(
    Transaction.MULTI_CALL,
    [multicallParams]
  );
}

export function nonfungiblePositionManagerAbi(dapp: Dapp): Interface {
  const abi =
    dapp === Dapp.KYBER
      ? IKyberNonfungiblePositionManager.abi
      : INonfungiblePositionManager.abi;
  return new ethers.utils.Interface(abi);
}
