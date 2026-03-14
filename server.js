import express from 'express';
import webhookHandler from './api/webhooks.js';

const app = express();
const port = 3000;

// Middleware to parse URL-encoded bodies and JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Main webhook route
app.all('/api/webhooks', (req, res) => {
  // Pass the Express req and res down to the serverless-style handler
  webhookHandler(req, res);
});

// Start the server
app.listen(port, () => {
  console.log(`\n=========================================`);
  console.log(`🚀 Webhook Test Server running on port ${port}`);
  console.log(`==========================================`);
  console.log(`\nYour webhook URL is:`);
  console.log(`http://localhost:${port}/api/webhooks`);
  console.log(`(Make sure ngrok is pointing to port ${port})`);
});
