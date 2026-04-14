module.exports = {
  networks: {
    hardhat: {
      chains: {
        137: { hardforkHistory: { london: 23850000 } },     // Polygon
        10: { hardforkHistory: { london: 0 } },             // Optimism
        42161: { hardforkHistory: { london: 0 } },           // Arbitrum
        8453: { hardforkHistory: { london: 0 } },            // Base
        9745: { hardforkHistory: { london: 0 } },            // Plasma
        999: { hardforkHistory: { london: 0 } },             // Hyperliquid
      },
    },
  },
  solidity: "0.8.20",
};