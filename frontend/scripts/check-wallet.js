import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';

const WALLET_ADDRESS = "0x476E8bDaa5645DCdEdeAb89cA7F939E8F30759D0";

async function checkWallet() {
  try {
    console.log(`Checking wallet: ${WALLET_ADDRESS}`);
    console.log('Network: Hyperliquid Testnet\n');
    
    const transport = new HttpTransport({ isTestnet: true });
    const infoClient = new InfoClient({ transport });
    
    // Get account state
    const state = await infoClient.clearinghouseState({ user: WALLET_ADDRESS });
    
    console.log('=== ACCOUNT BALANCE ===');
    console.log(`Available Balance: $${parseFloat(state.withdrawable || '0').toFixed(2)} USDC`);
    console.log(`Account Value: $${parseFloat(state.marginSummary?.accountValue || '0').toFixed(2)}`);
    console.log(`Total Margin Used: $${parseFloat(state.marginSummary?.totalMarginUsed || '0').toFixed(2)}`);
    
    if (state.assetPositions && state.assetPositions.length > 0) {
      console.log('\n=== OPEN POSITIONS ===');
      state.assetPositions.forEach(pos => {
        console.log(`${pos.position.coin}: ${pos.position.szi} (Entry: $${pos.position.entryPx})`);
      });
    } else {
      console.log('\n=== OPEN POSITIONS ===');
      console.log('No open positions');
    }
    
    // Get asset metadata
    console.log('\n=== AVAILABLE ASSETS ===');
    const meta = await infoClient.meta();
    meta.universe.forEach((asset, index) => {
      console.log(`${index}: ${asset.name} (Max Leverage: ${asset.maxLeverage}x)`);
    });
    
    if (parseFloat(state.withdrawable || '0') === 0) {
      console.log('\n🚨 WALLET NEEDS FUNDING!');
      console.log('Your wallet has $0.00 USDC on Hyperliquid testnet.');
      console.log('You need testnet funds to trade.');
      console.log('\nTo get testnet funds:');
      console.log('1. Join Hyperliquid Discord: https://discord.gg/hyperliquid');
      console.log('2. Ask for testnet faucet in #dev-support channel');
      console.log(`3. Provide your address: ${WALLET_ADDRESS}`);
    }
    
  } catch (error) {
    console.error('Error checking wallet:', error);
  }
}

checkWallet();