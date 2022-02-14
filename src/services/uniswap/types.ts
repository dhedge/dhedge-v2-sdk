import { FeeAmount } from "@uniswap/v3-sdk";
import { ethers } from "ethers";

export type UniswapV3MintParams = [
  string,
  string,
  FeeAmount,
  number,
  number,
  ethers.BigNumber | string,
  ethers.BigNumber | string,
  ethers.BigNumber | string,
  ethers.BigNumber | string,
  string,
  number
];
