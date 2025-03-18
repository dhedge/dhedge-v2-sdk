module.exports = {
  networks: {
    baseGoerli: {
      url: "https://goerli.base.org", // Replace with your node URL
      chainId: 8453,
      hardforkHistory: {
        // Specify the hardfork activation block numbers for chainId 8453
        london: 27411493, // Example: London hardfork activated at block 27411493
        // Add other hardforks as needed
      },
    },
  },
  solidity: "0.8.20",
};