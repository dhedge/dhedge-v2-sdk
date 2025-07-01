import { ethers, Pool } from "../..";
import ICompoundV3Comet from "../../abi/compound/ICompoundV3Comet.json";
import IFToken from "../../abi/fluid/IFToken.json";

export async function getCompoundV3LendTxData(
  pool: Pool,
  market: string,
  asset: string,
  amount: ethers.BigNumber | string
): Promise<string> {
  if (await isCompoundV3Market(pool, market)) {
    return new ethers.utils.Interface(
      ICompoundV3Comet
    ).encodeFunctionData("supply", [asset, amount]);
  } else {
    //Fluid lending
    return new ethers.utils.Interface(IFToken).encodeFunctionData("deposit", [
      amount,
      pool.address
    ]);
  }
}

export async function getCompoundV3WithdrawTxData(
  pool: Pool,
  market: string,
  asset: string,
  amount: ethers.BigNumber | string
): Promise<string> {
  if (await isCompoundV3Market(pool, market)) {
    return new ethers.utils.Interface(
      ICompoundV3Comet
    ).encodeFunctionData("withdraw", [asset, amount]);
  } else {
    //Fluid withdrawal
    return new ethers.utils.Interface(IFToken).encodeFunctionData("redeem", [
      amount,
      pool.address,
      pool.address
    ]);
  }
}

export async function isCompoundV3Market(
  pool: Pool,
  market: string
): Promise<boolean> {
  const marketContract = new ethers.Contract(
    market,
    ICompoundV3Comet,
    pool.signer
  );
  try {
    await marketContract.baseToken();
    return true;
  } catch (error) {
    return false;
  }
}
