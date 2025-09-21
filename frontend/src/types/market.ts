export enum MarketStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RESOLVED = 'RESOLVED',
  PAUSED = 'PAUSED',
}

export interface CreateMarketDTO {
  question: string;
  tags?: string[];
  profileImage?: string;
  slug: string;
  endDate?: string;
}

export interface UpdateMarketDTO {
  question?: string;
  status?: MarketStatus;
  tags?: string[];
  profileImage?: string;
  endDate?: string;
}

export interface MarketResponseDTO {
  id: string;
  question: string;
  status: MarketStatus;
  tags: string[];
  profileImage: string | null;
  slug: string;
  volume: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  resolvedAt: string | null;
}

export interface CreateNFTPositionDTO {
  marketSlug: string;
  userAddress: string;
  onChainId?: string;
  amount: bigint;
  lowerBound: bigint;
  upperBound: bigint;
  payout?: bigint;
}

export interface CloseNFTPositionDTO {
  payout: bigint;
}

export interface NFTPositionResponseDTO {
  id: string;
  marketId: string;
  userId: string;
  onChainId?: string;
  amount: bigint;
  payout: bigint;
  lowerBound: bigint;
  upperBound: bigint;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  market?: MarketResponseDTO;
  user?: {
    id: string;
    address: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
}
