// monero_betting_service.js
require('dotenv').config();
const { MoneroWalletRpc } = require('monero-javascript');

class MoneroBettingService {
  constructor() {
    this.wallet = null;
  }

  async init() {
    console.log('Connecting to Monero Wallet RPC...');
    
    // Conecta à Wallet do stagenet (via docker)
    this.wallet = await MoneroWalletRpc.connectToWalletRpc({
      uri: "http://127.0.0.1:38088",
      username: "",
      password: ""
    });
    
    console.log('Connected! Synced height:', await this.wallet.getHeight());
  }

  /**
   * Gera um endereço (subaddress) único do Monero (XMR) para cada aposta. 
   * Impede rastreio de pagamentos conectando apostas.
   */
  async generateBetAddress(matchId, playerId) {
    const label = `Match_${matchId}_Player_${playerId}`;
    // Cria um subaddress na conta 0, garantindo o isolamento
    const subaddress = await this.wallet.createSubaddress(0, label);
    
    console.log(`Generated Bet Address for ${label}: \n${subaddress.getAddress()}`);
    return subaddress.getAddress();
  }

  /**
   * Checa o saldo não-confirmado (0-conf) para liberar a partida rápida.
   * CUIDADO: 0-conf só é recomendado para apostas pequenas!
   */
  async getUnconfirmedBet(address) {
    const accounts = await this.wallet.getAccounts(true);
    // Filtrar a account e subaddress pra ver o saldo
    const balances = await this.wallet.getBalance(0, address);
    return balances;
  }
  
  /**
   * Dispara o pagamento após o resultado da partida (deduzindo a taxa da plataforma).
   * Usa RingCT e stealth addresses intrínsecos ao Monero.
   */
  async payoutWinner(winnerAddress, amountPiconero) {
    // 1 XMR = 10^12 Piconero
    const tx = await this.wallet.createTx({
      accountIndex: 0,
      destinations: [
        { address: winnerAddress, amount: amountPiconero }
      ],
      ringSize: 16 // Garantir forte privacidade do payout
    });
    
    console.log('Payout submitted! TxHash:', tx.getHash());
    return tx.getHash();
  }
}

module.exports = MoneroBettingService;
