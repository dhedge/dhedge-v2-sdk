import { BigNumber, Wallet, Contract } from "ethers";
import IERC20 from "../../abi/IERC20.json";

export const balanceDelta = async (
  owner: string,
  asset: string,
  signer: Wallet
): Promise<BigNumber> => {
  const block = await signer.provider.getBlockNumber();
  const iERC20 = new Contract(asset, IERC20.abi, signer);
  const [balanceBefore, balanceAfter] = await Promise.all(
    [block - 1, block].map(e => iERC20.balanceOf(owner, { blockTag: e }))
  );
  return balanceAfter.sub(balanceBefore);
};

export const allowanceDelta = async (
  owner: string,
  asset: string,
  spender: string,
  signer: Wallet
): Promise<BigNumber> => {
  const block = await signer.provider.getBlockNumber();
  const iERC20 = new Contract(asset, IERC20.abi, signer);
  const [allowanceBefore, allowanceAfter] = await Promise.all(
    [block - 1, block].map(e =>
      iERC20.allowance(owner, spender, { blockTag: e })
    )
  );
  return allowanceAfter.sub(allowanceBefore);
};
