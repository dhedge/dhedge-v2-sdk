import { Contract, ethers } from "ethers";
import { Pool } from "../../entities";
import IFlatcoinVaultAbi from "../../abi/flatmoney/IFlatcoinVault.json";
import KeeperFeeAbi from "../../abi/flatmoney/KeeperFee.json";
import { flatMoneyContractAddresses } from "../../config";
import BigNumber from "bignumber.js";

export const getKeeperFeeContract = async (pool: Pool): Promise<Contract> => {
  const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
  if (!flatMoneyContracts) {
    throw new Error(
      `getStableModuleContract: network of ${pool.network} not supported`
    );
  }
  const flatcoinVaultContract = new Contract(
    flatMoneyContracts.FlatcoinVault,
    IFlatcoinVaultAbi,
    pool.signer
  );
  const key = ethers.utils.formatBytes32String("keeperFee");
  const keeperFeeContractAddress: string = await flatcoinVaultContract.callStatic.moduleAddress(
    key
  );

  const keeperFeeContract = new ethers.Contract(
    keeperFeeContractAddress,
    KeeperFeeAbi,
    pool.signer
  );
  return keeperFeeContract;
};

export const getKeeperFee = async (pool: Pool): Promise<ethers.BigNumber> => {
  const keeperFeeContract = await getKeeperFeeContract(pool);
  const blockinfo = await pool.signer.provider.getBlock("latest");
  const basefee = blockinfo.baseFeePerGas;

  if (basefee) {
    const keeperfee = await keeperFeeContract["getKeeperFee(uint256)"](
      new BigNumber(basefee.mul(2).toString()).toFixed(0)
    );
    return keeperfee;
  } else {
    const keeperfee = await keeperFeeContract["getKeeperFee()"]();
    return keeperfee;
  }
};
