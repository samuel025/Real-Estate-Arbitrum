"use client";

import "./globals.css";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { AppProvider } from '../context';

const activeChain = {
  chainId: 421614,
  rpc: ["https://sepolia-rollup.arbitrum.io/rpc"],
  nativeCurrency: {
    name: "Arbitrum Sepolia",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorerUrls: ["https://sepolia.arbiscan.io/"],
};

export default function RootLayout({ children }) {
  const clientId = "1816f41bc9201efeaa93a8d04d64af19";
  
  return (
    <html lang="en">
      <body>
        <ThirdwebProvider 
          activeChain={activeChain}
          clientId={clientId}
        >
          <AppProvider>
            {children}
          </AppProvider>
        </ThirdwebProvider>
      </body>
    </html>
  );
}
