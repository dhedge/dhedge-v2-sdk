import { Dapp, ethers, Pool } from "../..";

import IAaveV3PoolAddressProvider from "../../abi/IAaveV3PoolAddressProvider.json";
import IPriceOracle from "../../abi/IPriceOracle.json";
import { aaveAddressProvider } from "../../config";

export async function getChainlinkPriceInUsd(
  pool: Pool,
  asset: string
): Promise<ethers.BigNumber> {
  //Workaround as Chainlink doesn't have feed registry on Polygon/Optimism
  //Use oracle from Aave which uses Chainlink
  const lendingPoolAddressProvider = new ethers.Contract(
    aaveAddressProvider[pool.network][Dapp.AAVEV3] as string,
    IAaveV3PoolAddressProvider.abi,
    pool.signer
  );

  const priceOracleAddress = await lendingPoolAddressProvider.getPriceOracle();
  const priceOracle = new ethers.Contract(
    priceOracleAddress,
    IPriceOracle.abi,
    pool.signer
  );
  return await priceOracle.getAssetPrice(asset);
}
