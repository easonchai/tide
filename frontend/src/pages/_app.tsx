import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WalletProvider } from "@/contexts/WalletContext";
import { WagmiProvider } from "wagmi";
import { config } from "@/config/config";

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <Component {...pageProps} />
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
