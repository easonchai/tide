import { Module } from '@nestjs/common';
import { ClientService } from './client.service';

export const PUBLIC_CLIENT = 'PUBLIC_CLIENT';
export const ADMIN_WALLET_CLIENT = 'ADMIN_WALLET_CLIENT';

@Module({
  providers: [
    ClientService,
    {
      provide: PUBLIC_CLIENT,
      useFactory: (clientService: ClientService) =>
        clientService.createPublicClient(),
      inject: [ClientService],
    },
    {
      provide: ADMIN_WALLET_CLIENT,
      useFactory: async (clientService: ClientService) =>
        clientService.createAdminWalletClient(),
      inject: [ClientService],
    },
  ],
  exports: [PUBLIC_CLIENT, ADMIN_WALLET_CLIENT],
})
export class ClientModule {}
