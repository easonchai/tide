import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Address,
  Hex,
  PublicClient,
  WalletClient,
  WriteContractParameters,
} from 'viem';
import { ADMIN_WALLET_CLIENT, PUBLIC_CLIENT } from '../client/client.module';
import { clmsrMarketCoreAbi } from './abi/clmsr-market-core.abi';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  constructor(
    @Inject(PUBLIC_CLIENT) private readonly publicClient: PublicClient,
    @Inject(ADMIN_WALLET_CLIENT)
    private readonly adminWalletClient: WalletClient,
  ) {}

  async settleMarket(onChainId: bigint, settlementValue: bigint): Promise<Hex> {
    try {
      const CLMSR_CORE_ADDRESS = process.env.CLMSR_CORE_ADDRESS as Hex;
      if (!CLMSR_CORE_ADDRESS) {
        throw new Error('CLMSR_CORE_ADDRESS is required for settle market');
      }

      this.logger.log(
        `Settling market ${onChainId} on ${CLMSR_CORE_ADDRESS} with value ${settlementValue}`,
      );

      const { request } = await this.publicClient.simulateContract({
        account: this.adminWalletClient.account,
        address: CLMSR_CORE_ADDRESS,
        abi: clmsrMarketCoreAbi,
        functionName: 'settleMarket',
        args: [onChainId, settlementValue],
      });

      this.logger.debug(
        `Simulation successful for settle market ${onChainId} on ${CLMSR_CORE_ADDRESS} with value ${settlementValue}. Preparing to send transaction...`,
      );

      const txHash = await this.adminWalletClient.writeContract(
        request as WriteContractParameters,
      );

      this.logger.log(
        `Settle market transaction sent for market ${onChainId}. Tx Hash: ${txHash}`,
      );

      await this.publicClient.waitForTransactionReceipt({ hash: txHash });
      return txHash;
    } catch (error) {
      const errorMessage =
        (error as any).shortMessage ||
        (error as any).message ||
        'Unknown error';
      this.logger.error(
        `Failed to send settle market transaction for market ${onChainId}. Error ${errorMessage}`,
        (error as any).stack,
      );
      throw error;
    }
  }
}
