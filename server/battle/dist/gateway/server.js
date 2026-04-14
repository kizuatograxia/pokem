import { WsGateway } from './WsGateway.js';
const gateway = new WsGateway();
const port = Number(process.env.BATTLE_WS_PORT || 8788);
gateway.listen(port);
console.log(`Battle WebSocket gateway listening on ws://localhost:${port}`);
const shutdown = () => {
    void gateway.close().finally(() => {
        process.exit(0);
    });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
