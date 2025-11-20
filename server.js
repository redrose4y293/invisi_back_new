import { createServer } from 'http';
import app from './app.js';
import { config } from './src/config/env.js';

const server = createServer(app);
const port = config.port;

server.listen(port, () => {
  console.log(`InvisiShield API listening on port ${port}`);
});
