import { FORK_IDS } from "../types";
import { deletFork } from "./fork";

// setup.js
export default async () => {
  console.log("\nhello, this is just before shutting down");
  console.log("delete fork id", ((globalThis as unknown) as FORK_IDS).polygon);
  await deletFork(((globalThis as unknown) as FORK_IDS).polygon);
};
