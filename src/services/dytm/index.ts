import { Contract, ethers } from "ethers";
import IOffice from "../../abi/dytm/IOffice.json";
import IDYTMPeriphery from "../../abi/dytm/IDYTMPeriphery.json";
import { Pool } from "../../entities";
import { dytmContractAddresses } from "../../config";

const iOffice = new ethers.utils.Interface(IOffice);
const iDYTMPeriphery = new ethers.utils.Interface(IDYTMPeriphery);

const getShares = async (
  pool: Pool,
  tokenId: string | ethers.BigNumber,
  amount: ethers.BigNumber | string
): Promise<ethers.BigNumber> => {
  const dytmContracts = dytmContractAddresses[pool.network];
  if (!dytmContracts || !dytmContracts.Periphery) {
    throw new Error(`DYTM: network of ${pool.network} not supported`);
  }
  const peripheryContract = new Contract(
    dytmContracts.Periphery,
    iDYTMPeriphery,
    pool.signer
  );
  const shares = await peripheryContract.assetsToShares(
    tokenId,
    ethers.BigNumber.from(amount)
  );

  return shares;
};

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
  const debtId = toDebtId(ethers.BigNumber.from(asset));
  return iOffice.encodeFunctionData("repay", [
    {
      account: ethers.BigNumber.from(pool.address), // uint256 (converted address)
      key: asset,
      shares: await getShares(pool, debtId, amount),
      extraData: "0x"
    }
  ]);
};
export const getDytmWithdrawTxData = async (
  pool: Pool,
  asset: string,
  amount: ethers.BigNumber | string
): Promise<string> => {
  return iOffice.encodeFunctionData("withdraw", [
    {
      account: ethers.BigNumber.from(pool.address), // uint256 (converted address)
      tokenId: asset,
      shares: await getShares(pool, asset, amount),
      receiver: pool.address,
      extraData: "0x"
    }
  ]);
};
