import axios from "axios";
import BigNumber from "bignumber.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTxOptions = async (): Promise<any> => {
  const result = await axios("https://gasstation-mainnet.matic.network/v2");

  return {
    gasLimit: "3000000",
    maxPriorityFeePerGas: new BigNumber(result.data.fast.maxPriorityFee)
      .shiftedBy(9)
      .toFixed(0),
    maxFeePerGas: new BigNumber(result.data.fast.maxFee).shiftedBy(9).toFixed(0)
  };
};
