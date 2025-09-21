const DEFAULT_B = 100;
const EPSILON = 1e-9;

export function lmsrCost(q: number[], b: number): number {
  const sumExp = q.reduce((sum, qi) => sum + Math.exp(qi / b), 0);
  return b * Math.log(sumExp);
}

export function lmsrProb(q: number[], b: number): number[] {
  const expValues = q.map((qi) => Math.exp(qi / b));
  const denom = expValues.reduce((sum, value) => sum + value, 0) || 1;
  return expValues.map((value) => value / denom);
}

function calcCostForShares(
  q: number[],
  outcomeIndex: number,
  shares: number,
  b: number
): number {
  const qNew = [...q];
  qNew[outcomeIndex] += shares;
  return lmsrCost(qNew, b) - lmsrCost(q, b);
}

export function calcCostForBuy(
  q: number[],
  outcomeIndex: number,
  shares: number,
  b: number = DEFAULT_B
): number {
  return calcCostForShares(q, outcomeIndex, shares, b);
}

export function calcCostForSell(
  q: number[],
  outcomeIndex: number,
  shares: number,
  b: number = DEFAULT_B
): number {
  return -calcCostForShares(q, outcomeIndex, -shares, b);
}

// 주어진 금액으로 특정 outcome의 share를 얼마나 살 수 있는지 계산
export function buySharesForAmount(
  q: number[],
  outcomeIndex: number,
  amount: number,
  b: number = DEFAULT_B,
  tol: number = 1e-9
): { dq: number; cost: number } {
  if (amount <= 0) return { dq: 0, cost: 0 };

  let low = 0;
  let high = amount * 20; // 더 큰 상한값으로 설정
  const cost0 = lmsrCost(q, b);

  // 이분법으로 정확한 share 수량 찾기
  while (high - low > tol) {
    const mid = (low + high) / 2;
    const qNew = [...q];
    qNew[outcomeIndex] += mid;
    const cost = lmsrCost(qNew, b) - cost0;

    if (cost > amount) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return { dq: low, cost: amount };
}

// 특정 가격 범위에 대한 베팅 계산 (확실한 역관계 보장)
export function betOnPriceRange(
  q: number[],
  rangeBins: number[],
  amount: number,
  b: number = DEFAULT_B
): {
  winProbability: number;
  totalShares: number;
  receiveIfWin: number;
  profit: number;
} {
  if (amount <= 0 || rangeBins.length === 0) {
    return {
      winProbability: 0,
      totalShares: 0,
      receiveIfWin: 0,
      profit: 0,
    };
  }

  // 현재 확률 분포 계산
  const probs = lmsrProb(q, b);

  // Win probability = 선택된 range bin들의 확률 합
  const winProbability = rangeBins.reduce((sum, i) => sum + probs[i], 0);

  if (winProbability <= 0 || winProbability >= 1) {
    return {
      winProbability: 0,
      totalShares: 0,
      receiveIfWin: 0,
      profit: 0,
    };
  }

  // 확실한 역관계를 위한 간단한 공식
  // Win Probability가 높을수록 Receive if you win이 낮아져야 함
  // 기본 공식: receiveIfWin = amount / winProbability

  // 최소/최대 배당률 제한 (현실적인 범위)
  const minOdds = 1.01; // 1% 수익
  const maxOdds = 10.0; // 1000% 수익

  const rawReceiveIfWin = amount / winProbability;
  const receiveIfWin = Math.max(
    minOdds * amount,
    Math.min(maxOdds * amount, rawReceiveIfWin)
  );

  const totalShares = receiveIfWin; // share당 payout = 1
  const profit = receiveIfWin - amount;

  return {
    winProbability,
    totalShares,
    receiveIfWin,
    profit,
  };
}

export function calcSharesForCost(
  q: number[],
  outcomeIndex: number,
  cost: number,
  b: number = DEFAULT_B
): number {
  if (cost <= 0) return 0;

  let low = 0;
  let high = cost * 2;
  let mid: number;

  while (high - low > EPSILON) {
    mid = (low + high) / 2;
    const currentCost = calcCostForBuy(q, outcomeIndex, mid, b);
    if (currentCost < cost) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

export function calcMaxShares(q: number[], outcomeIndex: number): number {
  const currentQ = q[outcomeIndex];
  const otherQs = q.filter((_, i) => i !== outcomeIndex);
  const maxOtherQ = Math.max(...otherQs);

  if (currentQ >= maxOtherQ) {
    return Infinity;
  }

  return maxOtherQ - currentQ;
}

export function calcLiquidity(q: number[], b: number = DEFAULT_B): number {
  const probabilities = lmsrProb(q, b);
  const entropy = -probabilities.reduce(
    (sum, p) => sum + (p > 0 ? p * Math.log(p) : 0),
    0
  );
  return entropy * b;
}

export function calcMarketCap(q: number[], b: number = DEFAULT_B): number {
  const probabilities = lmsrProb(q, b);
  return probabilities.reduce((sum, p, i) => sum + p * q[i], 0);
}

export function calcTotalValue(q: number[], b: number = DEFAULT_B): number {
  return lmsrCost(q, b);
}

export function calcExpectedValue(
  q: number[],
  outcomeIndex: number,
  b: number = DEFAULT_B
): number {
  const probabilities = lmsrProb(q, b);
  return probabilities[outcomeIndex];
}

export function calcVariance(q: number[], b: number = DEFAULT_B): number {
  const probabilities = lmsrProb(q, b);
  const mean = probabilities.reduce((sum, p, i) => sum + p * i, 0);
  return probabilities.reduce(
    (sum, p, i) => sum + p * Math.pow(i - mean, 2),
    0
  );
}

export function calcSharpeRatio(q: number[], b: number = DEFAULT_B): number {
  const probabilities = lmsrProb(q, b);
  const mean = probabilities.reduce((sum, p, i) => sum + p * i, 0);
  const variance = calcVariance(q, b);
  const stdDev = Math.sqrt(variance);

  return stdDev > 0 ? mean / stdDev : 0;
}

export function calcKellyFraction(
  q: number[],
  outcomeIndex: number,
  b: number = DEFAULT_B
): number {
  const probabilities = lmsrProb(q, b);
  const p = probabilities[outcomeIndex];
  const odds = 1 / p - 1;

  return p > 0 ? Math.max(0, (p * odds - (1 - p)) / odds) : 0;
}

export function calcOptimalBet(
  q: number[],
  outcomeIndex: number,
  bankroll: number,
  b: number = DEFAULT_B
): number {
  const kellyFraction = calcKellyFraction(q, outcomeIndex, b);
  return Math.min(bankroll * kellyFraction, calcMaxShares(q, outcomeIndex));
}
