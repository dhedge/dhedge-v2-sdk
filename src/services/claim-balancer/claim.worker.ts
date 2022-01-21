// Shamelessly adapted from OpenZeppelin-contracts test utils
import { soliditySha3 } from "web3-utils";
import { loadTree, scale } from "../../utils";

import { ComputeClaimProofPayload } from "./types";

export class ClaimWorker {
  public calcClaimProof(payload: ComputeClaimProofPayload): any {
    const {
      report,
      account,
      claim,
      distributor,
      tokenIndex,
      decimals
    } = payload;

    const claimAmount = claim.amount;
    const merkleTree = loadTree(report, decimals);

    const scaledBalance = scale(claimAmount, decimals).toString(10);

    const proof = merkleTree.getHexProof(
      soliditySha3(
        { t: "address", v: account },
        { t: "uint", v: scaledBalance }
      )
    );

    return [parseInt(claim.id), scaledBalance, distributor, tokenIndex, proof];
  }
}
