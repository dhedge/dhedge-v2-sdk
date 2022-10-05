/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { computePoolAddress } from "@kyberswap/ks-sdk-elastic";
import { Token } from "@uniswap/sdk-core";
import { FeeAmount } from "@uniswap/v3-sdk";
import { dappFactoryAddress } from "../../config";
import { Dapp, Network } from "../../types";

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
    initCodeHashManualOverride: undefined
  });
}
