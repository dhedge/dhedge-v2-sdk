import axios from "axios";
import { BigNumber } from "ethers";
import { Network } from "../../types";
import { ApiError } from "../../errors";

// slippage of 0x is different from that of 1Inch
// in 0x, e.g. 0.03 for 3% slippage allowed
// 1inch slippage 0.5% represented by 0.5
// 0x slippage 0.5% represented by 0.005
const getZeroExSlippage = (slippage: number): number => {
  return Number(slippage) / 100;
};

export const getZeroExTradeTxData = async (
  network: Network,
  assetFrom: string,
  assetTo: string,
  amountIn: BigNumber | string,
  slippage = 0.5,
  takerAddress: string
): Promise<string> => {
  if (!process.env.ZEROEX_API_KEY)
    throw new Error("ZEROEX_API_KEY not configured in .env file");
  try {
    const slippagePercentage = getZeroExSlippage(slippage);
    const params = {
      buyToken: assetTo,
      sellToken: assetFrom,
      sellAmount: amountIn.toString(),
      // necessary to skip quote validation is that in which the takerAddress refers to a smart contract
      skipValidation: true,
      // Used to enable RFQ-T liquidity
      intentOnFilling: true,
      takerAddress,
      slippagePercentage
      // excludedSourcesParam
    };
    const response = await axios.get(
      `https://${network}.api.0x.org/swap/v1/quote`,
      {
        params,
        headers: {
          "0x-api-key": process.env.ZEROEX_API_KEY
        }
      }
    );

    return response.data.data;
  } catch (e) {
    throw new ApiError("Swap api request of 0x failed");
  }
};
