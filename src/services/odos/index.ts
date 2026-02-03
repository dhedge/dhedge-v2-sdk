/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { ApiError, ethers } from "../..";
import { networkChainIdMap, OdosSwapFeeRecipient } from "../../config";
import { Pool } from "../../entities";
import OdosRouterV3Abi from "../../abi/odos/OdosRouterV3.json";
import BigNumber from "bignumber.js";

export const odosBaseUrl = "https://enterprise-api.odos.xyz/sor";

// Types for Odos Router V3 swap function parameters
export interface SwapTokenInfo {
  inputToken: string;
  inputAmount: ethers.BigNumber;
  inputReceiver: string;
  outputToken: string;
  outputQuote: ethers.BigNumber;
  outputMin: ethers.BigNumber;
  outputReceiver: string;
}

export interface SwapReferralInfo {
  code: ethers.BigNumber;
  fee: ethers.BigNumber;
  feeRecipient: string;
}

export async function getOdosSwapTxData(
  pool: Pool,
  assetFrom: string,
  assetTo: string,
  amountIn: ethers.BigNumber | string,
  slippage: number
): Promise<{ swapTxData: string; minAmountOut: string }> {
  if (!process.env.ODOS_API_KEY) {
    throw new Error("ODOS_API_KEY is not set");
  }
  const ODOS_API_KEY = process.env.ODOS_API_KEY;

  const referralFeeBips = 2; // 2 basis points = 0.02%

  const quoteParams = {
    chainId: networkChainIdMap[pool.network],
    inputTokens: [
      {
        tokenAddress: assetFrom,
        amount: amountIn.toString()
      }
    ],
    outputTokens: [
      {
        tokenAddress: assetTo,
        proportion: 1
      }
    ],
    slippageLimitPercent: slippage,
    userAddr: pool.address,
    compact: false,
    referralFeeRecipient: OdosSwapFeeRecipient[pool.network],
    referralFee: referralFeeBips // 0.02% fee
  };
  try {
    const quoteResult = await axios.post(
      `${odosBaseUrl}/quote/v3`,
      quoteParams,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ODOS_API_KEY
        }
      }
    );

    const assembleParams = {
      pathId: quoteResult.data.pathId,
      userAddr: pool.address
    };

    const assembleResult = await axios.post(
      `${odosBaseUrl}/assemble`,
      assembleParams,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ODOS_API_KEY
        }
      }
    );

    const txData = assembleResult.data.transaction.data;

    // Decode the transaction data
    const iface = new ethers.utils.Interface(OdosRouterV3Abi.abi);
    const decodedData = iface.parseTransaction({ data: txData });

    const tokenInfo = decodedData.args[0] as SwapTokenInfo;
    const pathDefinition = decodedData.args[1] as string;
    const executor = decodedData.args[2] as string;
    const referralInfo = decodedData.args[3] as SwapReferralInfo;

    if (
      referralInfo.fee.lte(
        ethers.BigNumber.from((referralFeeBips * 1e18) / 10000)
      )
    ) {
      // Referral fee is already correct, return original txData
      return {
        swapTxData: assembleResult.data.transaction.data,
        minAmountOut: assembleResult.data.outputTokens[0].amount
      };
    }

    const FEE_DENOM = new BigNumber(1e18);
    const correctedFee = new BigNumber((referralFeeBips * 1e18) / 10000);
    const factor = 1.1;
    const correctedOutputQuote = new BigNumber(tokenInfo.outputQuote.toString())
      .times(
        FEE_DENOM.minus(correctedFee).div(
          FEE_DENOM.minus(referralInfo.fee.toString())
        )
      )
      .times(factor);

    // example referralInfo.fee could be 0.0005 * 1e18 = 500000000000000, which is 0.05%
    // Create corrected referral info
    const correctedTxData = iface.encodeFunctionData(decodedData.name, [
      {
        ...tokenInfo,
        outputQuote: correctedOutputQuote.toFixed(0)
      },
      pathDefinition,
      executor,
      {
        code: referralInfo.code,
        fee: correctedFee.toFixed(0), // align with referralFeeBips
        feeRecipient: referralInfo.feeRecipient
      }
    ]);

    return {
      swapTxData: correctedTxData,
      minAmountOut: assembleResult.data.outputTokens[0].amount
    };
  } catch (e) {
    console.error("Error in Odos API request:", e);
    throw new ApiError("Swap api request of Odos failed");
  }
}
