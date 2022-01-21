/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Shamelessly adapted from OpenZeppelin-contracts test utils
import BigNumber from "bignumber.js";
import { keccak256, keccakFromString, bufferToHex } from "ethereumjs-util";
import { hexToBytes, soliditySha3 } from "web3-utils";
import { scale } from "./index";

// Merkle tree called with 32 byte hex values
export class MerkleTree {
  public elements: any;
  public layers: any;

  constructor(elements: any[]) {
    this.elements = elements
      .filter((el: any) => el)
      .map(el => Buffer.from(hexToBytes(el)));

    // Sort elements
    this.elements.sort(Buffer.compare);
    // Deduplicate elements
    this.elements = this.bufDedup(this.elements);

    // Create layers
    this.layers = this.getLayers(this.elements);
  }

  getLayers(elements: string | any[]) {
    if (elements.length === 0) {
      return [[""]];
    }

    const layers = [];
    layers.push(elements);

    // Get next layer until we reach the root=
    while (layers[layers.length - 1].length > 1) {
      // @ts-ignore
      layers.push(this.getNextLayer(layers[layers.length - 1]));
    }

    return layers;
  }

  getNextLayer(elements: any[]) {
    return elements.reduce(
      (layer: any[], el: any, idx: number, arr: { [x: string]: any }) => {
        if (idx % 2 === 0) {
          // Hash the current element with its pair element
          layer.push(this.combinedHash(el, arr[idx + 1]));
        }

        return layer;
      },
      []
    );
  }

  combinedHash(first: any, second: any) {
    if (!first) {
      return second;
    }
    if (!second) {
      return first;
    }

    return keccak256(this.sortAndConcat(first, second));
  }

  getRoot() {
    return this.layers[this.layers.length - 1][0];
  }

  getHexRoot() {
    return bufferToHex(this.getRoot());
  }

  getProof(el: any) {
    let idx = this.bufIndexOf(el, this.elements);

    if (idx === -1) {
      throw new Error("Element does not exist in Merkle tree");
    }

    return this.layers.reduce((proof: any[], layer: any) => {
      const pairElement = this.getPairElement(idx, layer);

      if (pairElement) {
        proof.push(pairElement);
      }

      idx = Math.floor(idx / 2);

      return proof;
    }, []);
  }

  // external call - convert to buffer
  getHexProof(_el: any) {
    const el = Buffer.from(hexToBytes(_el));

    const proof = this.getProof(el);

    return this.bufArrToHexArr(proof);
  }

  getPairElement(idx: number, layer: string | any[]) {
    const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

    if (pairIdx < layer.length) {
      return layer[pairIdx];
    } else {
      return null;
    }
  }

  bufIndexOf(el: string | any[], arr: string | any[]) {
    let hash;

    // Convert element to 32 byte hash if it is not one already
    if (el.length !== 32 || !Buffer.isBuffer(el)) {
      hash = keccakFromString(el as string);
    } else {
      hash = el;
    }

    for (let i = 0; i < arr.length; i++) {
      if (hash.equals(arr[i])) {
        return i;
      }
    }

    return -1;
  }

  bufDedup(elements: any[]) {
    return elements.filter((el: any, idx: number) => {
      return idx === 0 || !elements[idx - 1].equals(el);
    });
  }

  bufArrToHexArr(arr: any[]) {
    if (arr.some((el: any) => !Buffer.isBuffer(el))) {
      throw new Error("Array is not an array of buffers");
    }

    return arr.map(
      (el: { toString: (arg0: string) => string }) => "0x" + el.toString("hex")
    );
  }

  sortAndConcat(...args: any[]) {
    return Buffer.concat([...args].sort(Buffer.compare));
  }
}

export function loadTree(
  balances: { [x: string]: string | BigNumber },
  decimals = 18
) {
  const elements: (string | null)[] = [];
  Object.keys(balances).forEach(address => {
    const balance: string = scale(balances[address], decimals).toString(10);
    const leaf = soliditySha3(
      { t: "address", v: address },
      { t: "uint", v: balance }
    );
    elements.push(leaf);
  });
  return new MerkleTree(elements);
}
