/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, ethers } from "ethers";
import IVelodromeGaugeV1 from "../../abi/IVelodromeGauge.json";
import IVelodromeGaugeV2 from "../../abi/IVelodromeGaugeV2.json";
import IVelodromeCLGauge from "../../abi/IVelodromeCLGauge.json";
import { Pool } from "../../entities";
import { call } from "../../utils/contract";
const iVelodromeGaugeV1 = new ethers.utils.Interface(IVelodromeGaugeV1.abi);
const iVelodromeGaugeV2 = new ethers.utils.Interface(IVelodromeGaugeV2.abi);

export function getVelodromeStakeTxData(
  amount: BigNumber | string,
  v2: boolean
): any {
  const depositParams: [string, unknown[]] = v2
    ? ["deposit(uint256)", [amount]]
    : ["deposit", [amount, 0]];
  const iVelodromeGauge = v2 ? iVelodromeGaugeV2 : iVelodromeGaugeV1;
  return iVelodromeGauge.encodeFunctionData(...depositParams);
}

export async function getVelodromeClaimTxData(
  pool: Pool,
  gauge: string,
  v2: boolean
): Promise<any> {
  if (v2) {
    return iVelodromeGaugeV2.encodeFunctionData("getReward", [pool.address]);
  } else {
    const rewardAssetCount = await call(pool.signer, IVelodromeGaugeV1.abi, [
      gauge,
      "rewardsListLength",
      []
    ]);
    const rewardAssets = await Promise.all(
      Array.from(Array(rewardAssetCount.toNumber()).keys()).map(e =>
        call(pool.signer, IVelodromeGaugeV1.abi, [gauge, "rewards", [e]])
      )
    );
    return iVelodromeGaugeV1.encodeFunctionData("getReward", [
      pool.address,
      rewardAssets
    ]);
  }
}

export async function getVelodromeCLClaimTxData(tokenId: string): Promise<any> {
  const iVelodromeCLGauge = new ethers.utils.Interface(IVelodromeCLGauge.abi);
  return iVelodromeCLGauge.encodeFunctionData("getReward(uint256)", [tokenId]);
}
