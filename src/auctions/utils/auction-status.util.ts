export enum AuctionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  WINNING = 'WINNING',
  OUTBID = 'OUTBID',
  DONE = 'DONE',
}

export type AuctionStatusType = AuctionStatus;

export interface AuctionWithBids {
  id: string;
  endTime: Date;
  startingPrice: number | object;
  bids: Array<{
    amount: number | object;
    bidderId: string;
  }>;
}

export function calculateCurrentPrice(auction: AuctionWithBids): number {
  if (auction.bids.length === 0) {
    return Number(auction.startingPrice);
  }

  return Math.max(...auction.bids.map((bid) => Number(bid.amount)));
}

export function calculateAuctionStatus(
  auction: AuctionWithBids,
  userId?: string,
): AuctionStatus {
  const now = new Date();
  const isExpired = auction.endTime < now;

  if (isExpired) {
    return AuctionStatus.DONE;
  }

  if (!userId) {
    return AuctionStatus.IN_PROGRESS;
  }

  const userBid = auction.bids.find((bid) => bid.bidderId === userId);
  if (!userBid) {
    return AuctionStatus.IN_PROGRESS;
  }

  const highestBid = calculateCurrentPrice(auction);
  return Number(userBid.amount) >= highestBid
    ? AuctionStatus.WINNING
    : AuctionStatus.OUTBID;
}

export function getUserBidAmount(
  auction: AuctionWithBids,
  userId: string,
): number | undefined {
  const userBid = auction.bids.find((bid) => bid.bidderId === userId);
  return userBid ? Number(userBid.amount) : undefined;
}

export function isValidBidAmount(
  bidAmount: number,
  currentPrice: number,
  minIncrement: number = 1,
): boolean {
  return bidAmount > currentPrice && bidAmount >= currentPrice + minIncrement;
}

export function isAuctionActive(endTime: Date): boolean {
  return new Date() < endTime;
}
