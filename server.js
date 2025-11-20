import { createServer } from 'http';
import app from './app.js';
import { config } from './src/config/env.js';

const server = createServer(app);
const port = config.port;
const host = '0.0.0.0'; // Listen on all network interfaces

server.listen(port, host, () => {
  console.log(`InvisiShield API listening on http://${host}:${port}`);
  console.log(`CORS allowed origins:`, config.corsOrigins);
});
