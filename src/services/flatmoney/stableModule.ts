import { BigNumber, Contract } from "ethers";
import { flatMoneyContractAddresses } from "../../config";
import { Pool } from "../../entities";
import StableModuleAbi from "../../abi/flatmoney/StableModule.json";

const getStableModuleContract = (pool: Pool): Contract => {
  const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
  if (!flatMoneyContracts) {
    throw new Error(
      `getStableModuleContract: network of ${pool.network} not supported`
    );
  }
  const stableModuleContract = new Contract(
    flatMoneyContracts.StableModule,
    StableModuleAbi,
    pool.signer
  );
  return stableModuleContract;
};

/// @notice Quoter function for getting the stable deposit amount out.
export const getStableDepositQuote = async (
  pool: Pool,
  depositAmount: string | BigNumber
): Promise<BigNumber> => {
  const stableModuleContract = getStableModuleContract(pool);
  const amountOut: BigNumber = await stableModuleContract.stableDepositQuote(
    depositAmount.toString()
  );
  return amountOut;
};

/// @notice Quoter function for getting the stable withdraw amount out.
export const getStableWithdrawQuote = async (
  pool: Pool,
  withdrawAmount: string | BigNumber
): Promise<BigNumber> => {
  const stableModuleContract = getStableModuleContract(pool);
  const amountOut: BigNumber = await stableModuleContract.stableWithdrawQuote(
    withdrawAmount.toString()
  );
  return amountOut;
};
