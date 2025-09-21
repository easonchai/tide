import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Range, getTrackBackground } from "react-range";
import styles from "@/styles/Home.module.css";
import type { EthereumProvider } from "@walletconnect/ethereum-provider";
import { apiService } from "@/utils/apiService";

// Destructure apiService
const { market } = apiService;

// Question data type
type Question = {
  id: string;
  question: string;
  address: string;
  status: string;
  tags: string[];
  profileImage: string;
  slug: string;
  fee: string;
  volume: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  resolvedAt: string | null;
};

const shortenAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const isIgnorableWalletConnectError = (error: unknown) => {
  const message =
    typeof error === "string"
      ? error
      : (error as Error | undefined)?.message ?? "";

  if (!message) {
    return false;
  }

  return [
    "Record was recently deleted",
    "No matching key",
    "Pending session not found",
    "session topic doesn't exist",
  ].some((fragment) => message.includes(fragment));
};

const formatEthBalance = (weiHex: string) => {
  try {
    const wei = BigInt(weiHex);
    const etherWhole = wei / 10n ** 18n;
    const etherFraction = wei % 10n ** 18n;

    if (etherFraction === 0n) {
      return etherWhole.toString();
    }

    const fraction = etherFraction.toString().padStart(18, "0").slice(0, 4);
    const trimmedFraction = fraction.replace(/0+$/, "");

    return `${etherWhole.toString()}${
      trimmedFraction ? `.${trimmedFraction}` : ""
    }`;
  } catch (error) {
    console.error("ETH 잔액 포맷 실패", error);
    return "0";
  }
};

const clearWalletConnectStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storage = window.localStorage;

    Object.keys(storage)
      .filter((key) => key.startsWith("wc@"))
      .forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.warn("WalletConnect 스토리지 초기화 실패", error);
  }
};

export default function Home() {
  const PRICE_MIN = 77000;
  const PRICE_MAX = 116000;
  const PRICE_STEP = 1000;

  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [betAmount, setBetAmount] = useState(100);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    95000, 99000,
  ]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [showDisconnectTooltip, setShowDisconnectTooltip] = useState(false);

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const trackColors = useMemo(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return ["#1f2937", "#10b981", "#1f2937"] as const;
    }

    return ["#e5e7eb", "#059669", "#e5e7eb"] as const;
  }, []);
  const providerRef = useRef<EthereumProvider | null>(null);
  const connectWrapperRef = useRef<HTMLDivElement | null>(null);

  const fetchWalletBalance = useCallback(async (address: string) => {
    const provider = providerRef.current;

    if (!provider) {
      return;
    }

    setWalletBalance(null);
    setIsFetchingBalance(true);

    try {
      const balanceHex = (await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })) as string;

      setWalletBalance(formatEthBalance(balanceHex));
    } catch (error) {
      if (!isIgnorableWalletConnectError(error)) {
        console.error("지갑 잔액 조회 실패", error);
      }
      setWalletBalance(null);
    } finally {
      setIsFetchingBalance(false);
    }
  }, []);

  const handleAccountsChanged = useCallback(
    (accounts: string[]) => {
      const nextAccount = accounts?.[0] ?? null;
      setWalletAddress(nextAccount);

      if (nextAccount) {
        void fetchWalletBalance(nextAccount);
      } else {
        setWalletBalance(null);
      }

      setShowDisconnectTooltip(false);
    },
    [fetchWalletBalance]
  );

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
    setWalletBalance(null);
    setShowDisconnectTooltip(false);
    providerRef.current = null;
  }, []);

  const connectWallet = useCallback(async () => {
    if (isConnecting || walletAddress) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

    if (!projectId) {
      setConnectError("WalletConnect 프로젝트 ID가 설정되어 있지 않습니다.");
      return;
    }

    setShowDisconnectTooltip(false);
    setIsConnecting(true);
    setConnectError(null);

    try {
      if (!providerRef.current) {
        const { EthereumProvider } = await import(
          "@walletconnect/ethereum-provider"
        );

        const provider = await EthereumProvider.init({
          projectId,
          showQrModal: true,
          chains: [1],
          optionalChains: [137, 42161, 10],
          methods: ["eth_sendTransaction", "personal_sign"],
          optionalMethods: [
            "eth_accounts",
            "eth_requestAccounts",
            "eth_sign",
            "eth_signTypedData",
            "eth_getBalance",
          ],
          events: ["chainChanged", "accountsChanged"],
          optionalEvents: ["disconnect"],
        });

        provider.on("accountsChanged", handleAccountsChanged);
        provider.on("disconnect", handleDisconnect);

        providerRef.current = provider;
      }

      let accounts: string[] = [];

      if (!providerRef.current.connected) {
        accounts =
          ((await providerRef.current.connect().catch((error) => {
            if (!isIgnorableWalletConnectError(error)) {
              console.error("WalletConnect 연결 요청 실패", error);
            }
            return [];
          })) as string[]) ?? [];
      }

      if (!accounts.length) {
        accounts = (await providerRef.current.enable()) as string[];
      }

      if (accounts?.length) {
        setWalletAddress(accounts[0]);
        void fetchWalletBalance(accounts[0]);
        setShowDisconnectTooltip(false);
      }
    } catch (error) {
      if (!isIgnorableWalletConnectError(error)) {
        console.error("WalletConnect 연결 실패", error);
      }

      if (providerRef.current) {
        await providerRef.current.disconnect().catch((disconnectError) => {
          if (!isIgnorableWalletConnectError(disconnectError)) {
            console.warn("WalletConnect 세션 정리 실패", disconnectError);
          }
        });
      }

      clearWalletConnectStorage();
      setConnectError("지갑 연결에 실패했습니다. 다시 시도해주세요.");
      providerRef.current = null;
    } finally {
      setIsConnecting(false);
    }
  }, [
    fetchWalletBalance,
    handleAccountsChanged,
    handleDisconnect,
    isConnecting,
    walletAddress,
  ]);

  const disconnectWallet = useCallback(async () => {
    const provider = providerRef.current;

    if (!provider) {
      setWalletAddress(null);
      setWalletBalance(null);
      return;
    }

    try {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("disconnect", handleDisconnect);

      if (provider.connected) {
        try {
          await provider.disconnect();
        } catch (error) {
          const message = (error as Error | undefined)?.message ?? "";

          if (!message.includes("Record was recently deleted")) {
            throw error;
          }
        }
      }
    } catch (error) {
      if (!isIgnorableWalletConnectError(error)) {
        console.error("WalletConnect 연결 해제 실패", error);
      }
    } finally {
      providerRef.current = null;
      setWalletAddress(null);
      setWalletBalance(null);
      setConnectError(null);
      setShowDisconnectTooltip(false);
      clearWalletConnectStorage();
    }
  }, [handleAccountsChanged, handleDisconnect]);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const response = await market.getAll({
        status: "OPEN",
      });
      console.log(response);
      setQuestions(response.data || []);
    } catch (error) {
      console.error("질문 목록 조회 실패", error);
      setQuestionsError("질문 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        const provider = providerRef.current;
        provider.removeListener?.("accountsChanged", handleAccountsChanged);
        provider.removeListener?.("disconnect", handleDisconnect);

        if (provider.connected) {
          void provider.disconnect().catch((error) => {
            if (!isIgnorableWalletConnectError(error)) {
              console.warn("WalletConnect 정리 실패", error);
            }
          });
        }
      }

      setWalletAddress(null);
      setWalletBalance(null);
      setShowDisconnectTooltip(false);
      clearWalletConnectStorage();
    };
  }, [handleAccountsChanged, handleDisconnect]);

  useEffect(() => {
    if (!showDisconnectTooltip) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        connectWrapperRef.current &&
        !connectWrapperRef.current.contains(event.target as Node)
      ) {
        setShowDisconnectTooltip(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDisconnectTooltip]);

  // Bitcoin data matching the design
  const bitcoin = {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    currentPrice: 96582,
    priceChangePercentage24h: 2.34,
    volume: "2.1B",
  };

  // Market distribution data
  const marketDistribution = [
    { price: 77000, probability: 35 },
    { price: 79000, probability: 44 },
    { price: 81000, probability: 50 },
    { price: 83000, probability: 46 },
    { price: 85000, probability: 65 },
    { price: 87000, probability: 73 },
    { price: 89000, probability: 86 },
    { price: 91000, probability: 87 },
    { price: 93000, probability: 101 },
    { price: 95000, probability: 101 },
    { price: 97000, probability: 112 },
    { price: 99000, probability: 107 },
    { price: 100000, probability: 90 },
    { price: 102000, probability: 77 },
    { price: 104000, probability: 83 },
    { price: 106000, probability: 62 },
    { price: 108000, probability: 68 },
    { price: 110000, probability: 58 },
    { price: 112000, probability: 37 },
    { price: 114000, probability: 34 },
    { price: 116000, probability: 38 },
  ];

  // Calculate potential payout (simplified calculation)
  const selectedRange = marketDistribution.filter(
    (item) => item.price >= priceRange[0] && item.price <= priceRange[1]
  );
  const totalProbability = selectedRange.reduce(
    (sum, item) => sum + item.probability,
    0
  );
  const winProbability =
    totalProbability /
    marketDistribution.reduce((sum, item) => sum + item.probability, 0);
  const potentialPayout = Math.round(betAmount / winProbability);

  return (
    <>
      <Head>
        <title>Tide Markets</title>
        <meta name="description" content="Realtime crypto markets overview" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 12L9 6L15 12L21 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 18L9 12L15 18L21 12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className={styles.brandName}>Tide</span>
          </div>

          <nav className={styles.navigation}>
            <a href="#" className={styles.navLink}>
              Markets
            </a>
            <a href="#" className={styles.navLink}>
              Portfolio
            </a>
            <a href="#" className={styles.navLink}>
              Analytics
            </a>
          </nav>

          <div className={styles.headerActions}>
            <div className={styles.walletInfo}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12V7H5a2 2 0 01-2-2V5a2 2 0 012-2h14v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 5v14a2 2 0 002 2h16v-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="16"
                  cy="12"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              {walletAddress && (
                <span className={styles.walletAmount}>
                  {isFetchingBalance
                    ? "Loading..."
                    : walletBalance
                    ? `${walletBalance} ETH`
                    : "-"}
                </span>
              )}
            </div>
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
                className={`${styles.connectButton} ${
                  walletAddress ? styles.connectButtonConnected : ""
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

      <div className={styles.container}>
        {/* Questions Section */}
        <section className={styles.questionsSection}>
          <div className={styles.questionsHeader}>
            <h2 className={styles.questionsTitle}>Active Questions</h2>
            {isLoadingQuestions && (
              <div className={styles.loading}>Loading...</div>
            )}
            {questionsError && (
              <div className={styles.error}>{questionsError}</div>
            )}
          </div>

          <div className={styles.questionsList}>
            {questions.map((question) => (
              <div key={question.id} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <div className={styles.questionProfile}>
                    <img
                      src={question.profileImage}
                      alt="Profile"
                      className={styles.questionProfileImage}
                    />
                    <span className={styles.questionAddress}>
                      {shortenAddress(question.address)}
                    </span>
                  </div>
                  <div className={styles.questionStatus}>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[question.status.toLowerCase()]
                      }`}
                    >
                      {question.status}
                    </span>
                  </div>
                </div>

                <h3 className={styles.questionText}>{question.question}</h3>

                <div className={styles.questionTags}>
                  {question.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className={styles.questionFooter}>
                  <div className={styles.questionStats}>
                    <span className={styles.volume}>
                      Volume: ${(Number(question.volume) / 1e18).toFixed(2)}
                    </span>
                    <span className={styles.fee}>
                      Fee: {(Number(question.fee) / 1e18).toFixed(4)} ETH
                    </span>
                  </div>
                  <div className={styles.questionEndDate}>
                    Ends: {new Date(question.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <main className={styles.main}>
          {!showPredictionModal ? (
            // Bitcoin Card View
            <div className={styles.card}>
              {/* Header with icon, name, and chevron */}
              <div className={styles.cardHeader}>
                <div className={styles.coinInfo}>
                  <div className={styles.coinIcon}>
                    <span className={styles.iconText}>BT</span>
                  </div>
                  <div className={styles.coinDetails}>
                    <h2 className={styles.coinSymbol}>BTC</h2>
                    <p className={styles.coinName}>{bitcoin.name}</p>
                  </div>
                </div>
                <div
                  onClick={() => setShowPredictionModal(true)}
                  className={styles.chevron}
                >
                  ›
                </div>
              </div>

              {/* Price and Volume Section */}
              <div className={styles.priceVolumeSection}>
                <div className={styles.priceInfo}>
                  <div className={styles.priceContainer}>
                    <span className={styles.price}>
                      ${bitcoin.currentPrice.toLocaleString()}
                    </span>
                    <div className={styles.priceChange}>
                      <span className={styles.arrow}>↗</span>
                      <span className={styles.positive}>
                        +{bitcoin.priceChangePercentage24h}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.volumeInfo}>
                  <p className={styles.volumeLabel}>Volume</p>
                  <p className={styles.volumeValue}>${bitcoin.volume}</p>
                </div>
              </div>

              {/* Predict Range Button */}
              <button
                onClick={() => setShowPredictionModal(true)}
                className={styles.predictButton}
              >
                Predict Range
              </button>
            </div>
          ) : (
            // Prediction View
            <div className={styles.predictionView}>
              {/* Header */}
              <div className={styles.predictionHeader}>
                <div className={styles.coinInfo}>
                  <div className={styles.coinIcon}>
                    <span className={styles.iconText}>BT</span>
                  </div>
                  <div className={styles.coinDetails}>
                    <h2 className={styles.coinSymbol}>BTC</h2>
                    <p className={styles.coinName}>{bitcoin.name}</p>
                  </div>
                </div>
                <div className={styles.closeButton}>
                  <span
                    onClick={() => setShowPredictionModal(false)}
                    className={styles.closeLabel}
                  >
                    Close
                  </span>
                </div>
              </div>

              {/* Price and Volume */}
              <div className={styles.predictionPriceVolume}>
                <div className={styles.predictionPriceInfo}>
                  <div className={styles.priceContainer}>
                    <span className={styles.predictionPrice}>
                      ${bitcoin.currentPrice.toLocaleString()}
                    </span>
                    <div className={styles.predictionPriceChange}>
                      <span className={styles.arrow}>↗</span>
                      <span className={styles.positive}>
                        +{bitcoin.priceChangePercentage24h}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.predictionVolumeInfo}>
                  <p className={styles.predictionVolumeLabel}>Volume</p>
                  <p className={styles.predictionVolumeValue}>
                    ${bitcoin.volume}
                  </p>
                </div>
              </div>

              {/* Market Distribution */}
              <div className={styles.marketDistribution}>
                <h3 className={styles.sectionTitle}>Market Distribution</h3>
                <div className={styles.distributionGrid}>
                  {marketDistribution.map((item, index) => (
                    <div key={index} className={styles.distributionItem}>
                      <span className={styles.probabilityValue}>
                        {item.probability}
                      </span>
                      <span className={styles.priceValue}>
                        ${(item.price / 1000).toFixed(0)}k
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Select Price Range */}
              <div className={styles.selectPriceRange}>
                <h3 className={styles.sectionTitle}>Select Price Range</h3>
                <div className={styles.rangeSliderContainer}>
                  <Range
                    values={priceRange}
                    step={PRICE_STEP}
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    onChange={(values) => {
                      const [minValue, maxValue] = values as [number, number];
                      setPriceRange([
                        Math.min(minValue, maxValue),
                        Math.max(minValue, maxValue),
                      ]);
                    }}
                    ariaLabel={["Minimum price", "Maximum price"]}
                    renderTrack={({ props, children }) => {
                      const { key: trackKey, style, ...trackProps } = props;

                      return (
                        <div
                          key={trackKey}
                          {...trackProps}
                          className={styles.rangeTrack}
                          style={{
                            ...style,
                            height: "4px",
                            width: "100%",
                            borderRadius: "2px",
                            background: getTrackBackground({
                              values: priceRange,
                              min: PRICE_MIN,
                              max: PRICE_MAX,
                              colors: trackColors,
                            }),
                          }}
                        >
                          {children}
                        </div>
                      );
                    }}
                    renderThumb={({ props, index, isDragged }) => {
                      const { key: thumbKey, style, ...thumbProps } = props;

                      return (
                        <div
                          key={thumbKey}
                          {...thumbProps}
                          className={styles.rangeThumb}
                          style={{
                            ...style,
                            height: "18px",
                            width: "18px",
                            borderRadius: "50%",
                            backgroundColor: "white",
                            border: "1px solid #000000",
                            boxShadow: "none",
                            cursor: isDragged ? "grabbing" : "grab",
                          }}
                        >
                          <span className={styles.rangeThumbValue}>
                            ${priceRange[index].toLocaleString()}
                          </span>
                        </div>
                      );
                    }}
                  />
                </div>
                <div className={styles.rangeValues}>
                  <span className={styles.rangeMin}>
                    ${priceRange[0].toLocaleString()}
                  </span>
                  <span className={styles.rangeMax}>
                    ${priceRange[1].toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bet Amount and Potential Payout */}
              <div className={styles.bettingInputs}>
                <div className={styles.betAmount}>
                  <label className={styles.inputLabel}>Bet Amount</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) =>
                      setBetAmount(parseInt(e.target.value) || 0)
                    }
                    className={styles.betInput}
                  />
                </div>
                <div className={styles.potentialPayout}>
                  <label className={styles.inputLabel}>Potential Payout</label>
                  <input
                    type="number"
                    value={potentialPayout}
                    readOnly
                    className={styles.payoutInput}
                  />
                </div>
              </div>

              {/* Place Bet Button */}
              <button className={styles.placeBetButton}>Place Bet</button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
