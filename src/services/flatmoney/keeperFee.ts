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

export const getKeeperFee = async (
  pool: Pool,
  maxKeeperFeeInUsd: number | null
): Promise<ethers.BigNumber> => {
  const keeperFeeContract = await getKeeperFeeContract(pool);
  const gasPrice = await pool.signer.provider.getGasPrice();

  let keeperfee: ethers.BigNumber;
  if (gasPrice) {
    keeperfee = await keeperFeeContract["getKeeperFee(uint256)"](
      new BigNumber(gasPrice.toString()).times(1.2).toFixed(0)
    );
  } else {
    keeperfee = await keeperFeeContract["getKeeperFee()"]();
  }

  const keeperFeeInUsd = await getKeeperFeeInUsd(pool, keeperfee);

  if (
    Number.isFinite(maxKeeperFeeInUsd) &&
    keeperFeeInUsd.gt(ethers.BigNumber.from(maxKeeperFeeInUsd).toString())
  ) {
    throw new Error("mintUnitViaFlatMoney: keeperFee too large");
  }

  return keeperfee;
};

export const getKeeperFeeInUsd = async (
  pool: Pool,
  keeperFee: ethers.BigNumber
): Promise<BigNumber> => {
  const flatMoneyContracts = flatMoneyContractAddresses[pool.network];
  if (!flatMoneyContracts) {
    throw new Error(
      `getKeeperFeeInUsd: network of ${pool.network} not supported`
    );
  }
  const fundComposition = await pool.getComposition();
  const filteredFc = fundComposition.filter(
    fc =>
      fc.asset.toLocaleLowerCase() ===
      flatMoneyContracts.RETH.toLocaleLowerCase()
  );

  if (!filteredFc[0])
    throw new Error(`getKeeperFeeInUsd: required asset not enabled yet`);

  const rateD1 = new BigNumber(filteredFc[0].rate.toString()).div(1e18);

  return rateD1.times(keeperFee.toString()).div(1e18);
};
