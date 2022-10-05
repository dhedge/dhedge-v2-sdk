/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { computePoolAddress } from "@kyberswap/ks-sdk-elastic";
import { Token } from "@uniswap/sdk-core";
import { FeeAmount } from "@uniswap/v3-sdk";
import {
  dappFactoryAddress,
  kyberTickReaderAddress,
  networkChainIdMap,
  nonfungiblePositionManagerAddress
} from "../../config";
import { Pool } from "../../entities";
import { Dapp, Network } from "../../types";
import { call } from "../../utils/contract";
import IKyberTickReader from "../../abi/IKyberTickReader.json";

export function getKyberPoolAddress(
  network: Network,
  tokenA: Token,
  tokenB: Token,
  fee: FeeAmount
): string {
  const factoryAddress = dappFactoryAddress[network][Dapp.KYBER]!;
  return computePoolAddress({
    factoryAddress,
    tokenA,
    tokenB,
    fee,
    initCodeHashManualOverride:
      "0xc597aba1bb02db42ba24a8878837965718c032f8b46be94a6e46452a9f89ca01"
  });
}

export async function getKyberPreviousTicks(
  pool: Pool,
  tokenA: Token,
  tokenB: Token,
  fee: FeeAmount,
  tickLower: number,
  tickUpper: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const kyberPoolAddress = getKyberPoolAddress(
    pool.network,
    tokenA,
    tokenB,
    fee
  );
  const tickResults = await Promise.all(
    [tickLower, tickUpper].map(tick =>
      call(pool.signer, IKyberTickReader.abi, [
        kyberTickReaderAddress[pool.network],
        "getNearestInitializedTicks",
        [kyberPoolAddress, tick]
      ])
    )
  );
  return tickResults.map(e => e[0]);
}

export async function getKyberOwedFees(
  pool: Pool,
  tokenId: string,
  assetA: string,
  assetB: string,
  fee: FeeAmount
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const chainId = networkChainIdMap[pool.network];
  const decimals = await Promise.all(
    [assetA, assetB].map(asset => pool.utils.getDecimals(asset))
  );
  const tokenA = new Token(chainId, assetA, decimals[0]);
  const tokenB = new Token(chainId, assetB, decimals[1]);
  const kyberPoolAddress = getKyberPoolAddress(
    pool.network,
    tokenA,
    tokenB,
    fee
  );
  const tickResults = await call(pool.signer, IKyberTickReader.abi, [
    kyberTickReaderAddress[pool.network],
    "getTotalFeesOwedToPosition",
    [
      nonfungiblePositionManagerAddress[pool.network][Dapp.KYBER],
      kyberPoolAddress,
      tokenId
    ]
  ]);

  return tickResults;
}
