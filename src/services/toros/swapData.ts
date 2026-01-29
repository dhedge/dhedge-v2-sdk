import axios from "axios";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { odosBaseUrl, SwapReferralInfo, SwapTokenInfo } from "../odos";
import { networkChainIdMap, OdosSwapFeeRecipient } from "../../config";
import OdosRouterV3Abi from "../../abi/odos/OdosRouterV3.json";

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
  if (!process.env.ODOS_API_KEY) {
    throw new Error("ODOS_API_KEY is not set");
  }
  const ODOS_API_KEY = process.env.ODOS_API_KEY;
  const network = (Object.keys(networkChainIdMap) as Array<
    keyof typeof networkChainIdMap
  >).find(key => networkChainIdMap[key] === chainId);
  if (!network) {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }

  const referralFeeBips = 2; // 2 basis points = 0.02%

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
    referralFee: referralFeeBips, // 0.02% fee
    referralFeeRecipient: OdosSwapFeeRecipient[network],
    compact: false
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
      userAddr: from
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
      referralInfo.fee.eq(
        ethers.BigNumber.from((referralFeeBips * 1e18) / 10000)
      )
    ) {
      // Referral fee is already correct, return original txData
      return txData;
    }

    // Create corrected referral info
    const correctedTxData = iface.encodeFunctionData(decodedData.name, [
      tokenInfo,
      pathDefinition,
      executor,
      {
        code: referralInfo.code,
        fee: ethers.BigNumber.from((referralFeeBips * 1e18) / 10000), // align with referralFeeBips
        feeRecipient: referralInfo.feeRecipient
      }
    ]);

    return correctedTxData;
  } catch (e) {
    console.error("Error in Odos API request:", e);
    throw new Error("Swap api request of Odos failed");
  }
};
