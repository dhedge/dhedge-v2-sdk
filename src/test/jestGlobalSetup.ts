import { Network } from "../types";
import { addFork } from "./fork";

// setup.js
export default async () => {
  console.log("\nhello, this is just before tests start running");
  await addFork(Network.POLYGON);
};
