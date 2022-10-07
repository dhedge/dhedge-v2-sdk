/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { computePoolAddress } from "@kyberswap/ks-sdk-elastic";
import { Token } from "@uniswap/sdk-core";
import { FeeAmount } from "@uniswap/v3-sdk";
import {
  dappFactoryAddress,
  kyberTickReaderAddress,
  networkChainIdMap,
  nonfungiblePositionManagerAddress,
  stakingAddress
} from "../../config";
import { Pool } from "../../entities";
import { Dapp, Network, Transaction } from "../../types";
import { call } from "../../utils/contract";
import IKyberTickReader from "../../abi/IKyberTickReader.json";
import IKyberSwapElasticLM from "../../abi/IKyberSwapElasticLM.json";
import { ethers } from "../..";
import { getUniswapV3Position } from "./V3Liquidity";
import { BigNumber } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";

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

export async function getKyberPoolAddressByAddress(
  pool: Pool,
  addressA: string,
  addressB: string,
  fee: FeeAmount
): Promise<string> {
  const chainId = networkChainIdMap[pool.network];
  const decimals = await Promise.all(
    [addressA, addressB].map(asset => pool.utils.getDecimals(asset))
  );
  const tokenA = new Token(chainId, addressA, decimals[0]);
  const tokenB = new Token(chainId, addressB, decimals[1]);
  return getKyberPoolAddress(pool.network, tokenA, tokenB, fee);
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
  const kyberPoolAddress = await getKyberPoolAddressByAddress(
    pool,
    assetA,
    assetB,
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

export function getKyberDepositWithdrawTxData(
  tokenId: string,
  transaction: Transaction
): string {
  const iKyberSwapElasticLM = new ethers.utils.Interface(
    IKyberSwapElasticLM.abi
  );
  return iKyberSwapElasticLM.encodeFunctionData(transaction, [[tokenId]]);
}

export async function getKyberPosition(
  pool: Pool,
  tokenId: string
): Promise<{ pId: number; position: any }> {
  const position = await getUniswapV3Position(Dapp.KYBER, tokenId, pool);
  const { fee, token0, token1 } = position.info;
  const kyberPoolAddress = await getKyberPoolAddressByAddress(
    pool,
    token0,
    token1,
    fee
  );

  const poolLength = await call(pool.signer, IKyberSwapElasticLM.abi, [
    stakingAddress[pool.network][Dapp.KYBER],
    "poolLength",
    []
  ]);
  const pids = [...Array(BigNumber.from(poolLength).toNumber()).keys()];

  const poolInfos = await Promise.all(
    pids.map(pid =>
      call(pool.signer, IKyberSwapElasticLM.abi, [
        stakingAddress[pool.network][Dapp.KYBER],
        "getPoolInfo",
        [pid]
      ])
    )
  );
  const pId = pids.find(
    (_, index) => poolInfos[index].poolAddress === kyberPoolAddress
  );
  if (!pId) throw new Error("no pId found for token");
  return { position, pId };
}

export async function getKyberStakeTxData(
  pool: Pool,
  tokenId: string
): Promise<string> {
  const { pId, position } = await getKyberPosition(pool, tokenId);
  const iKyberSwapElasticLM = new ethers.utils.Interface(
    IKyberSwapElasticLM.abi
  );
  return iKyberSwapElasticLM.encodeFunctionData(Transaction.JOIN, [
    pId,
    [tokenId],
    [position.pos.liquidity]
  ]);
}

export async function getKyberUnStakeTxData(
  pool: Pool,
  tokenId: string
): Promise<string> {
  const pId = await call(pool.signer, IKyberSwapElasticLM.abi, [
    stakingAddress[pool.network][Dapp.KYBER],
    "getJoinedPools",
    [tokenId]
  ]);
  const userInfo = await call(pool.signer, IKyberSwapElasticLM.abi, [
    stakingAddress[pool.network][Dapp.KYBER],
    "getUserInfo",
    [tokenId, pId[0]]
  ]);
  const iKyberSwapElasticLM = new ethers.utils.Interface(
    IKyberSwapElasticLM.abi
  );
  return iKyberSwapElasticLM.encodeFunctionData(Transaction.EXIT, [
    pId[0],
    [tokenId],
    [userInfo.liquidity]
  ]);
}

export async function getKyberHarvestTxData(
  pool: Pool,
  tokenId: string
): Promise<string> {
  const pId = await call(pool.signer, IKyberSwapElasticLM.abi, [
    stakingAddress[pool.network][Dapp.KYBER],
    "getJoinedPools",
    [tokenId]
  ]);
  const encodeData = defaultAbiCoder.encode(
    ["tupple(uint256[] pIds)"],
    [{ pIds: pId }]
  );
  const iKyberSwapElasticLM = new ethers.utils.Interface(
    IKyberSwapElasticLM.abi
  );
  return iKyberSwapElasticLM.encodeFunctionData(Transaction.HARVEST_MULTIPLE, [
    [tokenId],
    [encodeData]
  ]);
}
