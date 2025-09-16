import axios from "axios";
import BigNumber from "bignumber.js";
import { odosBaseUrl } from "../odos";

export const SWAPPER_ADDERSS = "0x4F754e0F0924afD74980886b0B479Fa1D7C58D0D";

export interface SwapParams {
  srcAsset: string; // Source asset address
  srcAmount: string; // Amount to swap (use string for big numbers)
  dstAsset: string; // Destination asset address
  chainId: number; // Chain ID
  from: string; // Sender address
  receiver: string; // Receiver address
  slippage: number; // Slippage tolerance in basis points (100 = 1%)
}

export const getSwapDataViaOdos = async ({
  srcAsset,
  srcAmount,
  dstAsset,
  chainId,
  from,
  slippage
}: SwapParams): Promise<string> => {
  let referralCode = 0; //  Defaults to 0 for unregistered activity.
  if (
    process.env.ODOS_REFERAL_CODE &&
    Number(process.env.ODOS_REFERAL_CODE) > 0
  ) {
    referralCode = Number(process.env.ODOS_REFERAL_CODE);
  }
  const quoteParams = {
    chainId: chainId,
    inputTokens: [
      {
        tokenAddress: srcAsset,
        amount: srcAmount
      }
    ],
    outputTokens: [
      {
        tokenAddress: dstAsset,
        proportion: 1
      }
    ],
    slippageLimitPercent: new BigNumber(slippage).div(100).toString(), // Convert basis points to percentage
    userAddr: from,
    referralCode
  };
  try {
    const quoteResult = await axios.post(
      `${odosBaseUrl}/quote/v2`,
      quoteParams
    );

    console.log("quoteResult from Odos", quoteResult.data);

    const assembleParams = {
      pathId: quoteResult.data.pathId,
      userAddr: from
    };

    const assembleResult = await axios.post(
      `${odosBaseUrl}/assemble`,
      assembleParams
    );
    return assembleResult.data.transaction.data;
  } catch (e) {
    console.error("Error in Odos API request:", e);
    throw new Error("Swap api request of Odos failed");
  }
};
