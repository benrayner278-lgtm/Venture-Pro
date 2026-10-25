const express = require('express');
const cors = require('cors');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set; refusing to start');
  process.exit(1);
}

const app = express();

// Middleware
app.set('trust proxy', 1);
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));
app.use(cors({ origin: allowedOrigins }));

// Webhook endpoint (must come before express.json())
const { handleWebhook } = require('./controllers/checkoutController');
app.post('/api/checkout/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Regular JSON middleware
app.use(express.json({ limit: '5mb' }));

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const checkoutRoutes = require('./routes/checkout');
const projectRoutes = require('./routes/projects');
const billingRoutes = require('./routes/billing');
const websiteRoutes = require('./routes/website');
const sitesRoutes = require('./routes/sites');
const publicSitesRoutes = require('./routes/publicSites');
const bookingRoutes = require('./routes/bookings');
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/website', websiteRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/public/sites', publicSitesRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});