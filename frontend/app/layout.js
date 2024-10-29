"use client";

import "./globals.css";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { UseAppContext } from "../context";

const customRpc = {
  chainId: 421614, // Replace this with your actual chainId for "polygon_amoy"
  rpc: ["https://sepolia-rollup.arbitrum.io/rpc"], // Replace with the correct RPC URL
  nativeCurrency: {
    name: "Arbitrum Sepolia",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorerUrls: ["https://sepolia.arbiscan.io/"], // Replace with the custom block explorer if needed
};


export default function RootLayout({ children }) {
  const clientId = "1816f41bc9201efeaa93a8d04d64af19"
  return (
    <html lang="en">
      <body>
        <ThirdwebProvider activeChain={customRpc} clientId={clientId}>
          <UseAppContext>
            {children}
          </UseAppContext> 
        </ThirdwebProvider>
      </body>
    </html>
  );
}
