import { cLMSRMarketCoreABI } from "@/abi/CLMSRMarketCore";
import { marketContract } from "@/config/config";
import { cn } from "@/lib/utils";
import Image from "next/image";
import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useAccount, useReadContract } from "wagmi";
import { useRouter } from "next/router";
import { MarketStatus } from "@/types/market";
import SellPositionModal from "@/components/SellPositionModal";

interface PortfolioPositionCardProps {
  id: string;
  marketId: string;
  onChainId?: string;
  amount: string | number | bigint;
  payout: string | number | bigint;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  market?: {
    id: string;
    question: string;
    status: MarketStatus;
    profileImage?: string | null;
    slug: string;
    endDate: string | null;
  };
  hedged?: boolean;
  onClick?: () => void;
}

const WEI_IN_ETH = 1e18;

const toNumber = (value: string | number | bigint | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return Number.isFinite(value) ? value : 0;
};

const weiToEth = (value: string | number | bigint | null | undefined): number => {
  return toNumber(value) / WEI_IN_ETH;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export default function PortfolioPositionCard({
  id,
  onChainId,
  amount,
  payout,
  deletedAt,
  market,
  hedged = false,
  onClick,
}: PortfolioPositionCardProps) {
  const [showSellModal, setShowSellModal] = useState(false);
  const { address } = useAccount();
  const router = useRouter();

  // Get current sell proceeds from smart contract
  const { data: calculatedSellProceed = BigInt(0) } = useReadContract({
    address: marketContract,
    abi: cLMSRMarketCoreABI,
    functionName: "calculatedSellProceed",
    args: onChainId ? [BigInt(onChainId)] : undefined,
    query: {
      enabled: Boolean(onChainId),
    },
  }) as { data: bigint };

  // Calculate values
  const investedAmount = useMemo(() => weiToEth(amount), [amount]);
  const currentValue = useMemo(() => {
    if (market?.status === "OPEN") {
      return weiToEth(calculatedSellProceed);
    }
    return weiToEth(payout);
  }, [market?.status, calculatedSellProceed, payout]);

  const isProfit = currentValue >= investedAmount;

  const handleSellClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!onChainId) {
      toast.error("Position ID not found");
      return;
    }

    setShowSellModal(true);
  };

  const handleSellSuccess = () => {
    // Refresh the position data or redirect
    window.location.reload();
  };

  const handleClaimClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!onChainId) {
      toast.error("Position ID not found");
      return;
    }

    // TODO: Implement claim functionality
    toast.success("Claim functionality will be implemented");
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (market?.slug) {
      router.push(`/coins/${market.slug}`);
    }
  };

  return (
    <>
      <div 
        className="bg-[#51D5EB1A] border border-[rgba(81,213,235,0.2)] rounded-xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 ease-in-out h-full min-h-[200px]"
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Image
              src={market?.profileImage || "/logo.svg"}
              alt="Profile"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div>
              <p className="text-white text-lg font-semibold mb-2 line-clamp-2 leading-tight break-words">
                {market?.question ?? "Unknown market"}
              </p>
              <p className="text-[#DEDEDE] text-sm font-normal">
                Ends {formatDateTime(
                  market?.status === "OPEN" ? market?.endDate ?? null : null
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Conditional Hedged Indicator */}
        {hedged && (
          <div className="flex items-center w-fit gap-1.5 p-2 bg-[#0E1B24] border border-[#51D5EB33] rounded-lg mb-2">
            <Image
              src="/hedge-icon.svg"
              alt="Hedged"
              width={12}
              height={12}
              className="w-4 h-4"
            />
            <span className="text-[#51D5EB] text-sm font-medium">Hedged</span>
          </div>
        )}

        {/* Investment Stats */}
        <div className="flex flex-row gap-2 justify-around mb-4 mt-auto items-end h-[60px]">
          <div className="flex flex-col justify-end items-center gap-1 h-full">
            <span className="text-[#DEDEDE] text-sm font-medium">Invested</span>
            <span className="text-white text-2xl font-bold">
              ${formatCurrency(investedAmount)}
            </span>
          </div>
          <div className="flex flex-col justify-end items-center gap-1 h-full">
            <span className="text-[#DEDEDE] text-sm font-medium">
              {market?.status === "OPEN" ? "Current Value" : "Final Value"}
            </span>
            <span className={cn(
              "text-2xl font-bold",
              isProfit ? "text-[#22c55e]" : "text-[#ef4444]"
            )}>
              ${formatCurrency(currentValue)}
            </span>
          </div>
        </div>

        {/* Sell Button for Open Markets */}
        {market?.status === "OPEN" && (
          <button
            className="bg-[#51D5EB] hover:bg-[#15D5EB] text-black border-none rounded-lg py-3 text-sm font-bold cursor-pointer transition-all duration-200 ease-in-out w-full"
            onClick={handleSellClick}
          >
            Sell
          </button>
        )}

        {/* Claim Button for Closed Markets */}
        {market?.status === "CLOSED" && (
          <>
            {deletedAt === null ? (
              <button
                className="bg-[#51D5EB] hover:bg-[#15D5EB] text-black border-none rounded-lg py-3 text-sm font-bold cursor-pointer transition-all duration-200 ease-in-out w-full"
                onClick={handleClaimClick}
              >
                Claim
              </button>
            ) : (
              <button
                className="bg-[#6b7280] text-white border-none rounded-lg py-3 text-sm font-bold cursor-not-allowed w-full"
                disabled
              >
                Claimed
              </button>
            )}
          </>
        )}
      </div>

      {/* Sell Position Modal - Outside the clickable card */}
      <SellPositionModal
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
        position={{
          id,
          question: market?.question ?? "Unknown market",
          profileImage: market?.profileImage,
          investedAmount,
          currentValue,
          isProfit,
        }}
        onSellSuccess={handleSellSuccess}
      />
    </>
  );
}