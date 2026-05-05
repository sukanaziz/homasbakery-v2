import express, { type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { PrismaClient } from './generated/prisma';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient();

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

app.get('/api/products', async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { available: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Graceful shutdown — close DB connection when server stops
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});