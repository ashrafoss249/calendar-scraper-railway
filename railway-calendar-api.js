const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { FastCalendarExplorer } = require('./test-calendar-html.js');
const { 
  initializeDatabase, 
  storeExplorationResults, 
  getLatestExplorationResults, 
  getAllExplorations 
} = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Railway Calendar Scraper API'
  });
});

// Main calendar scraping endpoint
app.post('/api/calendar/explore', async (req, res) => {
  try {
    console.log('🚀 Starting calendar exploration via API...');
    
    const startTime = Date.now();
    const explorer = new FastCalendarExplorer();
    const results = await explorer.exploreMultiMonth();
    const executionTime = Date.now() - startTime;
    
    // Store results in database
    await storeExplorationResults(results, executionTime);
    
    res.json({
      success: true,
      message: 'Calendar exploration completed successfully',
      data: {
        totalMonths: results.length,
        summary: generateSummary(results),
        executionTime: executionTime,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get latest results endpoint
app.get('/api/calendar/results', async (req, res) => {
  try {
    const results = await getLatestExplorationResults();
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching results:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all explorations endpoint
app.get('/api/calendar/explorations', async (req, res) => {
  try {
    const explorations = await getAllExplorations();
    res.json({
      success: true,
      data: explorations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching explorations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to generate summary
function generateSummary(results) {
  let totalAvailable = 0;
  let totalBooked = 0;
  let totalNoFlights = 0;
  let lastAvailableMonth = 0;

  results.forEach((result, index) => {
    if (result.available.length > 0) {
      lastAvailableMonth = index + 1;
    }
    totalAvailable += result.available.length;
    totalBooked += result.booked.length;
    totalNoFlights += result.noFlights.length;
  });

  return {
    totalAvailable,
    totalBooked,
    totalNoFlights,
    lastAvailableMonth,
    totalMonths: results.length
  };
}

// Initialize database on startup
initializeDatabase().catch(console.error);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Railway Calendar API Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📅 Calendar endpoint: http://localhost:${PORT}/api/calendar/explore`);
});

module.exports = app; 