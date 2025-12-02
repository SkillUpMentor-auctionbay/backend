export const corsConfig = {
  origin: process.env.CORS_ORIGIN || 'https://auctionbay-auctions.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Cache-Control',
    'Last-Event-ID',
  ],
  credentials: true,
};
