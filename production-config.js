/**
 * Production Configuration for Flight Automation
 * 
 * This file contains all the configurable settings for production optimization
 */

module.exports = {
  // Browser Settings
  browser: {
    headless: true,                    // Set to false for debugging
    slowMo: 0,                        // Milliseconds between actions (0 = fastest)
    timeout: 10000,                   // Page timeout in milliseconds
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  },

  // Timing Settings
  timing: {
    waitTime: 500,                    // Base wait time between actions
    navigationWait: 'domcontentloaded', // 'domcontentloaded' or 'networkidle'
    retryAttempts: 3,                 // Number of retry attempts for failed operations
    maxExecutionTime: 300000          // Maximum execution time (5 minutes)
  },

  // Test Settings
  test: {
    parallelTests: false,             // Enable parallel testing for multiple routes
    maxConcurrentTests: 2,           // Maximum concurrent tests
    enableRetry: true,               // Enable retry logic
    enableLogging: true,             // Enable detailed logging
    saveScreenshots: false,          // Save screenshots on failure
    saveResults: true                // Save results to JSON
  },

  // Performance Settings
  performance: {
    disableImages: true,             // Disable image loading for speed
    disableCSS: false,               // Keep CSS for proper rendering
    disableJavaScript: false,        // Keep JavaScript for functionality
    enableCache: true,               // Enable browser cache
    maxMemoryUsage: 512              // Maximum memory usage in MB
  },

  // Error Handling
  errorHandling: {
    continueOnError: true,           // Continue testing even if some tests fail
    logErrors: true,                 // Log detailed error information
    saveErrorLogs: true,             // Save error logs to file
    notifyOnFailure: false           // Send notifications on failure
  },

  // Data Extraction
  dataExtraction: {
    extractPrices: true,             // Extract price information
    extractFlightDetails: true,      // Extract flight details
    extractAvailability: true,       // Extract availability information
    extractFareClasses: true,        // Extract fare class information
    validateData: true               // Validate extracted data
  },

  // Output Settings
  output: {
    saveToFile: true,                // Save results to JSON file
    saveToDatabase: false,           // Save results to database
    formatOutput: 'json',            // Output format: 'json', 'csv', 'xml'
    includeMetadata: true,           // Include metadata in output
    compressOutput: false            // Compress output files
  },

  // Monitoring
  monitoring: {
    trackExecutionTime: true,        // Track execution time
    trackMemoryUsage: false,         // Track memory usage
    trackNetworkRequests: false,     // Track network requests
    generateReport: true,            // Generate execution report
    alertOnSlowExecution: true       // Alert if execution is too slow
  }
}; 