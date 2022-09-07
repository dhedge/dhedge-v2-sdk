import { Dapp, ethers, Pool } from "../..";

import ILendingPool from "../../abi/ILendingPool.json";
import ILendingPoolV3 from "../../abi/IAaveV3LendingPool.json";
import { routerAddress } from "../../config";

export async function getAaveAssetsForUnderlying(
  pool: Pool,
  dapp: Dapp,
  assets: string[]
): Promise<string[]> {
  const iLendingPool = dapp === Dapp.AAVEV3 ? ILendingPoolV3 : ILendingPool;
  const lendingPool = new ethers.Contract(
    routerAddress[pool.network][dapp] as string,
    iLendingPool.abi,
    pool.signer
  );

  const reserveData = await Promise.all(
    assets.map(e => lendingPool.getReserveData(e))
  );

  const aTokens = reserveData.map(e => e.aTokenAddress);
  const debtTokens = reserveData.map(e => e.variableDebtTokenAddress);
  return aTokens.concat(debtTokens);
}
