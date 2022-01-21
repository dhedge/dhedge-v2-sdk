/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import BigNumber from "bignumber.js";
import { soliditySha3 } from "web3-utils";
import { MerkleTree } from "./merkle";

export function scale(
  input: BigNumber | string,
  decimalPlaces: number
): BigNumber {
  const unscaled = typeof input === "string" ? new BigNumber(input) : input;
  const scalePow = new BigNumber(decimalPlaces.toString());
  const scaleMul = new BigNumber(10).pow(scalePow);
  return unscaled.times(scaleMul);
}

export function loadTree(
  balances: { [x: string]: string | BigNumber },
  decimals = 18
) {
  const elements: any[] = [];
  Object.keys(balances).forEach(address => {
    const balance: string = scale(balances[address], decimals).toString(10);
    const leaf = soliditySha3(
      { t: "address", v: address },
      { t: "uint", v: balance }
    );
    // @ts-ignore
    elements.push(leaf);
  });
  return new MerkleTree(elements);
}

export function bnum(val: string | number | BigNumber): BigNumber {
  const number = typeof val === "string" ? val : val ? val.toString() : "0";
  return new BigNumber(number);
}
