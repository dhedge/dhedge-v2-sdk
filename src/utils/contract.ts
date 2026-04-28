/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import set from "lodash/set";
import { Interface } from "@ethersproject/abi";
import { multiCallAddress } from "../config";
import { ethers, Network, Pool, SDKOptions } from "..";
import { Signer } from "ethers";

/** Single contract read: `call = [address, methodName, params?]`. */
export async function call(
  provider: ethers.Signer,
  abi: any[],
  call: any[],
  options?: any
) {
  const contract = new ethers.Contract(call[0], abi, provider);
  try {
    const params = call[2] || [];
    return await contract[call[1]](...params, options || {});
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Batch multiple contract reads through Multicall's `tryAggregate`.
 * Each call entry is `[address, methodName, params]`. When `requireSuccess` is false,
 * failing calls return `null` instead of reverting the whole batch.
 */
export async function multicall<T>(
  network: Network,
  provider: ethers.Signer,
  abi: any[],
  calls: any[],
  options: any = {},
  requireSuccess = false
): Promise<(T | null)[]> {
  const multi = new ethers.Contract(
    multiCallAddress[network],
    [
      "function tryAggregate(bool requireSuccess, tuple(address, bytes)[] memory calls) public view returns (tuple(bool, bytes)[] memory returnData)"
    ],
    provider
  );
  const itf = new Interface(abi);
  try {
    const res: [boolean, string][] = await multi.tryAggregate(
      // if false, allows individual calls to fail without causing entire multicall to fail
      requireSuccess,
      calls.map(call => [
        call[0].toLowerCase(),
        itf.encodeFunctionData(call[1], call[2])
      ]),
      options
    );

    return res.map(([success, returnData], i) => {
      if (!success) return null;
      const decodedResult = itf.decodeFunctionResult(calls[i][1], returnData);
      // Automatically unwrap any simple return values
      return decodedResult.length > 1 ? decodedResult : decodedResult[0];
    });
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Fluent helper for building a multicall and dispatching results into a typed object.
 * Use `.call(path, address, fn, params)` repeatedly, then `.execute()` returns the
 * populated object with results placed at the given lodash paths.
 */
export class Multicaller {
  public network: Network;
  public provider: ethers.Signer;
  public abi: any[];
  public options: any = {};
  public calls: any[] = [];
  public paths: any[] = [];

  constructor(network: Network, provider: ethers.Signer, abi: any[]) {
    this.network = network;
    this.provider = provider;
    this.abi = abi;
  }

  call(path: any, address: any, fn: any, params?: any): Multicaller {
    this.calls.push([address, fn, params]);
    this.paths.push(path);
    return this;
  }

  async execute(from?: any): Promise<any> {
    const obj = from || {};
    const result = await multicall(
      this.network,
      this.provider,
      this.abi,
      this.calls,
      this.options
    );
    result.forEach((r, i) => set(obj, this.paths[i], r));
    this.calls = [];
    this.paths = [];
    return obj;
  }
}

const getGasEstimateData = async (
  pool: Pool,
  estimateFunc: ethers.ContractFunction<ethers.BigNumber>,
  txInfoData: { to: string; txData: string; minAmountOut: any },
  txOptions: any = {},
  sdkOptions: SDKOptions
) => {
  let gas = null;
  let gasEstimationError = null;
  try {
    if (
      !pool.isDhedge ||
      (!isSdkOptionsBoolean(sdkOptions) && sdkOptions.useTraderAddressAsFrom)
    ) {
      // for pool.signer.estimateGas
      gas = await (estimateFunc as Signer["estimateGas"])({
        to: txInfoData.to,
        data: txInfoData.txData,
        ...txOptions
      });
    } else {
      // for pool.poolLogic.estimateGas.execTransaction
      gas = await estimateFunc(txInfoData.to, txInfoData.txData, txOptions);
    }
  } catch (e) {
    gasEstimationError = e;
  }
  return {
    gas,
    gasEstimationError,
    ...txInfoData
  };
};

export const isSdkOptionsBoolean = (
  sdkOptions: SDKOptions
): sdkOptions is boolean => {
  return typeof sdkOptions === "boolean";
};

/**
 * Central executor for SDK transactions. Routes a (`to`, `data`, `txOptions`) tuple
 * through one of four paths depending on `pool.isDhedge` and `sdkOptions`:
 *   - dHEDGE pool:    `pool.poolLogic.execTransaction(...)` (or its gas estimate)
 *   - non-dHEDGE/EOA: `pool.signer.sendTransaction(...)` (or its gas estimate)
 * Honours `sdkOptions.onlyGetTxData` (returns the encoded tx without sending),
 * `estimateGas` (returns gas + minAmountOut without sending), and
 * `useTraderAddressAsFrom` (forces the EOA path even for dHEDGE pools).
 */
export const getPoolTxOrGasEstimate = async (
  pool: Pool,
  args: any[],
  sdkOptions: SDKOptions
): Promise<any> => {
  const txInfoData = {
    txData: args[1],
    to: args[0],
    minAmountOut: args[3] || null
  };

  if (!isSdkOptionsBoolean(sdkOptions) && sdkOptions.onlyGetTxData) {
    return txInfoData;
  }

  const txOptions = args[2];

  if (
    !pool.isDhedge ||
    (!isSdkOptionsBoolean(sdkOptions) && sdkOptions.useTraderAddressAsFrom)
  ) {
    if (
      sdkOptions === true ||
      (!isSdkOptionsBoolean(sdkOptions) && sdkOptions.estimateGas)
    ) {
      return await getGasEstimateData(
        pool,
        pool.signer.estimateGas.bind(pool.signer),
        txInfoData,
        txOptions,
        sdkOptions
      );
    } else {
      return await pool.signer.sendTransaction({
        to: txInfoData.to,
        data: txInfoData.txData,
        ...txOptions
      });
    }
  } else {
    if (
      sdkOptions === true ||
      (!isSdkOptionsBoolean(sdkOptions) && sdkOptions.estimateGas)
    ) {
      return await getGasEstimateData(
        pool,
        pool.poolLogic.estimateGas.execTransaction,
        txInfoData,
        txOptions,
        sdkOptions
      );
    } else {
      return await pool.poolLogic.execTransaction(
        txInfoData.to,
        txInfoData.txData,
        txOptions
      );
    }
  }
};
