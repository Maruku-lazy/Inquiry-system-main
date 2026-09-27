require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const inquiriesRoutes = require('./routes/inquiries.routes');
const logsRoutes = require('./routes/logs.routes');
const organizationRoutes = require('./routes/organization.routes');
const customersRoutes = require('./routes/customers.routes');
const { errorHandler } = require('./middleware/errorHandler');
const { startActivityLogRetentionJob } = require('./jobs/purgeActivityLogs');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  })
);
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/contacts', customersRoutes);

// -- Serve the built frontend from this same process -----------------------
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

// Load SSL certificate files from the backend root folder

const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Inquiry Tracking API listening on http://localhost:${PORT}`);
  startActivityLogRetentionJob();
});

module.exports = app;