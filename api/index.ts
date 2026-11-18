import app, { serverReady } from '../server.js';

export default async function handler(req: any, res: any) {
  await serverReady;
  return app(req, res);
}
