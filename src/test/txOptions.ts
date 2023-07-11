import axios from "axios";
import BigNumber from "bignumber.js";
import { Network } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTxOptions = async (network: Network): Promise<any> => {
  if (network === Network.POLYGON) {
    const result = await axios("https://gasstation.polygon.technology/v2");
    return {
      gasLimit: "3000000",
      maxPriorityFeePerGas: new BigNumber(result.data.fast.maxPriorityFee)
        .shiftedBy(9)
        .toFixed(0),
      maxFeePerGas: new BigNumber(result.data.fast.maxFee)
        .shiftedBy(9)
        .toFixed(0)
    };
  } else {
    return { gasLimit: "3000000" };
  }
};
