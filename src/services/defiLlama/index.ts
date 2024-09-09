/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { ApiError, Dapp, ethers } from "../..";

import { Pool } from "../../entities";
import BigNumber from "bignumber.js";
import { dappDefiLlamaMap } from "../../config";

export type DefiLlamaResult = {
  amountReturned: BigNumber;
  protocolAddress: string;
  txData: string;
};

export async function getDefiLlamaSwapResult(
  pool: Pool,
  protocol: "1inch" | "Matcha/0x",
  assetFrom: string,
  assetTo: string,
  amountIn: ethers.BigNumber | string,
  slippage: number
): Promise<DefiLlamaResult> {
  if (!process.env.DEFILLAMA_API_KEY)
    throw new Error("DEFILLAMA_API_KEY not configured in .env file");

  const apiUrl = "https://swap-api.defillama.com/dexAggregatorQuote";
  const params = {
    from: assetFrom,
    to: assetTo,
    amount: amountIn.toString(),
    chain: pool.network,
    api_key: process.env.DEFILLAMA_API_KEY,
    protocol
  };
  const [fromDecimals, toDecimals] = await Promise.all(
    [assetFrom, assetTo].map(async asset => pool.utils.getDecimals(asset))
  );
  const body = {
    userAddress: pool.address,
    slippage: slippage,
    fromToken: {
      decimals: fromDecimals
    },
    toToken: {
      decimals: toDecimals
    }
  };
  try {
    const response = await axios.post(apiUrl, body, {
      params
    });

    return {
      amountReturned: new BigNumber(response.data.amountReturned),
      protocolAddress:
        protocol === "1inch"
          ? response.data.rawQuote.tx.to
          : response.data.rawQuote.to,
      txData:
        protocol === "1inch"
          ? response.data.rawQuote.tx.data
          : response.data.rawQuote.data
    };
  } catch (e) {
    throw new ApiError("Swap api request of DefiLlama failed");
  }
}

export async function getDefiLlamaTxData(
  pool: Pool,
  dapp: Dapp | null,
  assetFrom: string,
  assetTo: string,
  amountIn: ethers.BigNumber | string,
  slippage: number
): Promise<DefiLlamaResult> {
  if (!dapp) {
    const result = await Promise.all(
      Object.values(dappDefiLlamaMap).map(async protocol =>
        getDefiLlamaSwapResult(
          pool,
          protocol as any,
          assetFrom,
          assetTo,
          amountIn,
          slippage
        )
      )
    );
    const maxResult = result.reduce((max, current) => {
      return current.amountReturned.isGreaterThan(max.amountReturned)
        ? current
        : max;
    });
    return maxResult;
  } else {
    if (!(dapp === Dapp.ONEINCH || dapp === Dapp.ZEROEX))
      throw new Error("dapp not supported");
    return await getDefiLlamaSwapResult(
      pool,
      dappDefiLlamaMap[dapp] as any,
      assetFrom,
      assetTo,
      amountIn,
      slippage
    );
  }
}
