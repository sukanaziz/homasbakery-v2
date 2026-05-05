import express, { type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'homasbakery-api',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});