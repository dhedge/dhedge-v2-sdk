/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import set from "lodash/set";
import { Interface } from "@ethersproject/abi";
import { multiCallAddress } from "../config";
import { ethers, Network, Pool } from "..";

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

export const getPoolTxOrGasEstimate = async (
  pool: Pool,
  args: any[],
  estimateGas: boolean
): Promise<any> => {
  if (pool.isDhedge) {
    if (estimateGas) {
      return await pool.poolLogic.estimateGas.execTransaction(
        args[0],
        args[1],
        args[2]
      );
    } else {
      return await pool.poolLogic.execTransaction(args[0], args[1], args[2]);
    }
  } else {
    if (estimateGas) {
      return await pool.signer.estimateGas({ to: args[0], data: args[1] });
    } else {
      return await pool.signer.sendTransaction({
        to: args[0],
        data: args[1],
        ...args[2]
      });
    }
  }
};
