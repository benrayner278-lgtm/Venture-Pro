const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());

// Webhook endpoint (must come before express.json())
const { handleWebhook } = require('./controllers/checkoutController');
app.post('/api/checkout/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Regular JSON middleware
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const checkoutRoutes = require('./routes/checkout');
const projectRoutes = require('./routes/projects');
const billingRoutes = require('./routes/billing');
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/billing', billingRoutes);

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