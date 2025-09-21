import { cLMSRMarketCoreABI } from "@/abi/CLMSRMarketCore";
import { config, marketContract } from "@/config/config";
import { cn } from "@/lib/utils";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

interface PositionCardProps {
  profileImage?: string;
  question: string;
  invested: number;
  endDate: Date;
  positionOnChainId: string;
}

export default function PositionCard({
  profileImage,
  positionOnChainId,
  question,
  invested,
  endDate,
}: PositionCardProps) {
  const hedge = true;
  const [isSelling, setIsSelling] = useState(false);
  const { address } = useAccount();
  const { data: calculatedCloseProceeds = BigInt(0) } = useReadContract({
    address: marketContract,
    abi: cLMSRMarketCoreABI,
    functionName: "calculateCloseProceeds",
    args: [positionOnChainId],
    query: {
      enabled: Boolean(positionOnChainId),
    },
  }) as { data: bigint };
  const { writeContractAsync } = useWriteContract();

  const handleSell = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    setIsSelling(true);
    try {
      const tx = await writeContractAsync({
        address: marketContract,
        abi: cLMSRMarketCoreABI,
        functionName: "calculateCloseProceeds",
        args: [positionOnChainId],
      });

      if (!tx) return;

      const receipt = await waitForTransactionReceipt(config, { hash: tx });

      if (receipt.status === "reverted") {
        toast.error("Sell position failed");
        return
      }

      // TODO: add api call to close position

      toast.success("Successfully sold position");
    } catch (e) {
      console.error("Error selling position");
    } finally {
      setIsSelling(false);
    }
  };

  return (
    <div className="w-[322px] h-[248px] rounded-md bg-[#51D5EB1A] pt-3.5 pb-4 px-4 flex flex-col">
      <div className="w-full flex gap-2">
        <Image
          src={profileImage ?? "/tide-logo.svg"}
          alt="profileImage"
          width={32}
          height={32}
          className="object-contain rounded-full"
        />
        <div className="flex flex-col gap-0.5 text-white">
          <h3 className="font-semibold leading-none">{question}</h3>
          <h4 className="text-xs">Ends at {endDate.toLocaleString()}</h4>
        </div>
      </div>
      {hedge ? (
        <div className="py-1.5 h-[30px] px-3 flex gap-1 bg-[#0E1B24] text-[#51D5EB]">
          <>
            <Image
              src={profileImage ?? "/tide-logo.svg"}
              alt="profileImage"
              width={18}
              height={18}
              className="object-contain"
            />
            <p className="text-sm font-bold">Hedge</p>
          </>
        </div>
      ) : (
        <div className="py-1.5 h-[30px]" />
      )}
      <div className="w-full flex items-center justify-center gap-14 pt-5">
        <div className="flex flex-col items-center">
          <div className="text-sm">Invested</div>
          <div className="text-2xl font-semibold">${invested}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-sm">Current Value</div>
          <div
            className={cn(
              "text-2xl font-semibold",
              calculatedCloseProceeds > invested
                ? "text-[#22AB88]"
                : "text-[#DE4346]",
            )}
          >
            ${calculatedCloseProceeds}
          </div>
        </div>
      </div>
      <button
        className="bg-[#51D5EB] rounded-md flex items-center justify-center w-full text-black font-bold text-sm"
        onClick={handleSell}
      >
        Sell
      </button>
    </div>
  );
}
