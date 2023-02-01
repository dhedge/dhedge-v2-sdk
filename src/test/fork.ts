/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonRpcProvider } from "@ethersproject/providers";
import axios, { AxiosResponse } from "axios";
import * as dotenv from "dotenv";
import { Signer } from "ethers";
import { networkChainIdMap } from "../config";
import { Network } from "../types";

dotenv.config();

// describes forking request. network_id is the only required attribute,
// but feel free to override any
type TenderlyFork = {
  block_number?: number;
  network_id: string;
  initial_balance?: number;
  chain_config?: {
    chain_id: number;
  };
};

// All you need to access the forked environment from your tests
export type EthersOnTenderlyFork = {
  provider: JsonRpcProvider;
  /** test accounts: map from address to given address' balance */
  accounts: { [key: string]: string };
  /** test accounts: signers for transactions*/
  signers: Signer[];
  /** a function to remove fork from Tenderly infrastructure, meant for test clean-up */
  removeFork: () => Promise<AxiosResponse>;
};

const anAxiosOnTenderly = () =>
  axios.create({
    baseURL: "https://api.tenderly.co/api/v1",
    headers: {
      "X-Access-Key": process.env.TENDERLY_ACCESS_KEY || "",
      "Content-Type": "application/json"
    }
  });
/**
    Create a fork on Tenderly with parameters declared through the 
    fork parameter.
*/
export const addFork = async (network: Network): Promise<void> => {
  const projectUrl = `account/${process.env.TENDERLY_USER}/project/${process.env.TENDERLY_PROJECT}`;
  const axiosOnTenderly = anAxiosOnTenderly();
  const network_id = networkChainIdMap[network].toString();
  const fork: TenderlyFork = { network_id };
  const forkResponse = await axiosOnTenderly.post(`${projectUrl}/fork`, fork);
  const forkId = forkResponse.data.root_transaction.fork_id;

  (globalThis as any)[network] = forkId;
};

export const deletFork = async (forkId: string): Promise<void> => {
  const projectUrl = `account/${process.env.TENDERLY_USER}/project/${process.env.TENDERLY_PROJECT}`;
  const axiosOnTenderly = anAxiosOnTenderly();
  await axiosOnTenderly.delete(`${projectUrl}/fork/${forkId}`);
};
