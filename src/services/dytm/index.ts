import { ethers } from "ethers";
import IOffice from "../../abi/dytm/IOffice.json";
import { Pool } from "../../entities";

const iOffice = new ethers.utils.Interface(IOffice);

export function toDebtId(key: ethers.BigNumber): ethers.BigNumber {
  const tokenTypeBits = ethers.BigNumber.from(3).shl(248);
  return tokenTypeBits.or(key);
}

export const getDytmDepositTxData = (
  pool: Pool,
  asset: string,
  amount: ethers.BigNumber | string
): string => {
  return iOffice.encodeFunctionData("supply", [
    {
      account: ethers.BigNumber.from(pool.address), // uint256 (converted address)
      tokenId: asset,
      assets: amount,
      extraData: "0x"
    }
  ]);
};

export const getDytmBorrowTxData = (
  pool: Pool,
  asset: string,
  amount: ethers.BigNumber | string
): string => {
  return iOffice.encodeFunctionData("borrow", [
    {
      account: ethers.BigNumber.from(pool.address), // uint256 (converted address)
      key: asset,
      receiver: pool.address,
      assets: amount,
      extraData: "0x"
    }
  ]);
};

export const getDytmRepayTxData = async (
  pool: Pool,
  asset: string,
  amount: ethers.BigNumber | string
): Promise<string> => {
  return iOffice.encodeFunctionData("repay", [
    {
      account: ethers.BigNumber.from(pool.address), // uint256 (converted address)
      key: asset,
      withCollateralType: "0",
      assets: amount,
      shares: "0",
      extraData: "0x"
    }
  ]);
};
export const getDytmWithdrawTxData = async (
  pool: Pool,
  asset: string,
  amount: ethers.BigNumber | string
): Promise<string> => {
  const isMaxAmount = ethers.BigNumber.from(amount).eq(
    ethers.constants.MaxUint256
  );
  return iOffice.encodeFunctionData("withdraw", [
    {
      account: ethers.BigNumber.from(pool.address), // uint256 (converted address)
      tokenId: asset,
      assets: isMaxAmount ? 0 : amount,
      shares: isMaxAmount ? amount : 0,
      receiver: pool.address,
      extraData: "0x"
    }
  ]);
};
