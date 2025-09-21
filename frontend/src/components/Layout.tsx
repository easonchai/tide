import Head from "next/head";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import { useWallet } from "@/contexts/WalletContext";
import styles from "@/styles/Layout.module.css";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const shortenAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

export default function Layout({
  children,
  title = "Tide Markets",
  description = "Realtime crypto markets overview"
}: LayoutProps) {
  const router = useRouter();
  const {
    walletAddress,
    walletBalance,
    isConnecting,
    isFetchingBalance,
    connectError,
    showDisconnectTooltip,
    setShowDisconnectTooltip,
    connectWallet,
    disconnectWallet,
    connectWrapperRef
  } = useWallet();

  const isActivePage = (path: string) => router.pathname === path;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.pageWrapper}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.flexCompacted}>
              <div className={styles.brand}>
                <div className={styles.logo}>
                  <img src="/logo.svg" alt="Tide Logo" width="52" height="32" />
                </div>
                <img src="/tide-text.svg" alt="Tide" className={styles.brandText} />
              </div>

              <nav className={styles.navigation}>
                <a
                  href="/"
                  className={`${styles.navLink} ${isActivePage('/') ? styles.active : ''}`}
                >
                  Markets
                </a>
                <a
                  href="#"
                  className={styles.navLink}
                >
                  Portfolio
                </a>
                <a
                  href="/news"
                  className={`${styles.navLink} ${isActivePage('/news') ? styles.active : ''}`}
                >
                  News Feed
                </a>
              </nav>
            </div>


            <div className={styles.headerActions}>
              {walletAddress && (
                <div className={styles.walletBalance}>
                  {isFetchingBalance
                    ? "Loading..."
                    : walletBalance
                      ? `$${(parseFloat(walletBalance) * 2500).toFixed(0)}` // Approximate ETH to USD
                      : "$0"}
                </div>
              )}
              <div className={styles.connectWrapper} ref={connectWrapperRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (walletAddress) {
                      setShowDisconnectTooltip((prev) => !prev);
                      return;
                    }

                    if (!isConnecting) {
                      void connectWallet();
                    }
                  }}
                  disabled={isConnecting}
                  className={`${styles.connectButton} ${walletAddress ? styles.connectButtonConnected : ""
                    }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>
                    {walletAddress
                      ? shortenAddress(walletAddress)
                      : isConnecting
                        ? "Connecting..."
                        : "Connect"}
                  </span>
                </button>
                {connectError && (
                  <span className={styles.connectError}>{connectError}</span>
                )}
                {walletAddress && showDisconnectTooltip && (
                  <div className={styles.disconnectTooltip}>
                    <span className={styles.disconnectLabel}>Connected</span>
                    <span className={styles.disconnectAddress}>
                      {shortenAddress(walletAddress)}
                    </span>
                    <button
                      type="button"
                      className={styles.disconnectAction}
                      onClick={() => {
                        setShowDisconnectTooltip(false);
                        void disconnectWallet();
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>
    </>
  );
}