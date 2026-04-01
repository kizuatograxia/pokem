import { WsGateway } from './WsGateway.js';

const gateway = new WsGateway();

gateway.listen(8788);
console.log('Battle WebSocket gateway listening on ws://localhost:8788');

const shutdown = () => {
  void gateway.close().finally(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
