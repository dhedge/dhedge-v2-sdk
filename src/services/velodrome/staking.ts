/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, ethers } from "ethers";
import IVelodromeGauge from "../../abi/IVelodromeGauge.json";
import { Pool } from "../../entities";
import { Transaction } from "../../types";
import { call } from "../../utils/contract";
const iVelodromeGauge = new ethers.utils.Interface(IVelodromeGauge.abi);

export function getVelodromeStakeTxData(amount: BigNumber | string): any {
  return iVelodromeGauge.encodeFunctionData(Transaction.DEPOSIT, [amount, "0"]);
}

export async function getVelodromeClaimTxData(
  pool: Pool,
  gauge: string
): Promise<any> {
  const rewardAssetCount = await call(pool.signer, IVelodromeGauge.abi, [
    gauge,
    "rewardsListLength",
    []
  ]);
  const rewardAssets = await Promise.all(
    Array.from(Array(rewardAssetCount.toNumber()).keys()).map(e =>
      call(pool.signer, IVelodromeGauge.abi, [gauge, "rewards", [e]])
    )
  );
  return iVelodromeGauge.encodeFunctionData("getReward", [
    pool.address,
    rewardAssets
  ]);
}
