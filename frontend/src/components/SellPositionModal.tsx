import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiService } from "@/utils/apiService";
import toast from "react-hot-toast";

interface SellPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    id: string;
    question: string;
    profileImage?: string | null;
    investedAmount: number;
    currentValue: number;
    isProfit: boolean;
  };
  onSellSuccess?: () => void;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function SellPositionModal({ 
  isOpen, 
  onClose, 
  position, 
  onSellSuccess 
}: SellPositionModalProps) {
  const [isSelling, setIsSelling] = useState(false);

  const handleSell = async () => {
    setIsSelling(true);
    try {
      // Call the API to close the position
      await apiService.market.closePosition(position.id, {
        payout: Math.round(position.currentValue * 1e18) // Convert to wei
      });

      toast.success("Position sold successfully!");
      onSellSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error selling position:", error);
      toast.error("Failed to sell position");
    } finally {
      setIsSelling(false);
    }
  };

  const profit = position.currentValue - position.investedAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-[#1f2937] border-[#374151] max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{position.question}</DialogTitle>
          <DialogDescription>Sell position modal</DialogDescription>
        </DialogHeader>

        {/* Position Info */}
        <div className="flex flex-col space-y-4 py-4">
          {/* Market Question*/}
          <div className="flex items-center gap-3">
            <img
              src={position.profileImage || "/logo.svg"}
              alt="Profile"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <p className="text-white text-lg font-semibold line-clamp-2">
              {position.question}
            </p>
          </div>

          <div className="flex justify-around items-center py-4">
            <div className="flex flex-col items-center">
              <span className="text-[#DEDEDE] text-sm block mb-1">Invested</span>
              <span className="text-white text-2xl font-bold">
                ${formatCurrency(position.investedAmount)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div className={cn(
                "text-sm mb-1",
                position.isProfit ? "text-[#22c55e]" : "text-[#ef4444]"
              )}>
                {position.isProfit ? "You Won" : "You Lost"}
              </div>
              <div className={cn(
                "text-2xl font-bold",
                position.isProfit ? "text-[#22c55e]" : "text-[#ef4444]"
              )}>
                {profit >= 0 ? "+" : ""}${formatCurrency(Math.abs(profit))} 
              </div>
            </div>
          </div>

          {/* You'll Receive */}
          <div className="bg-[#51D5EB1A] border border-[#51D5EB33] rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-white text-lg font-semibold">You'll Receive</span>
              <span className="text-[#51D5EB] text-2xl font-bold">
                ${formatCurrency(position.currentValue)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-3">
          <button
            onClick={handleSell}
            disabled={isSelling}
            className="w-full bg-[#51D5EB] text-black py-3 px-4 rounded-lg font-bold hover:bg-[#3bc4d9] transition-colors disabled:opacity-50"
          >
            {isSelling ? "Claiming..." : "Claim"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}