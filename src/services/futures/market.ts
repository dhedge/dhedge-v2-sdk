import { ethers } from "../..";
import ISynthetixFuturesMarket from "../../abi/ISynthetixFuturesMarket.json";
import ISynthetixFuturesMarketV2 from "../../abi/ISynthetixFuturesMarketV2.json";

export function iSynthetixFuturesMarket(
  version: 1 | 2
): ethers.utils.Interface {
  const abi =
    version === 1 ? ISynthetixFuturesMarket.abi : ISynthetixFuturesMarketV2.abi;
  return new ethers.utils.Interface(abi);
}
