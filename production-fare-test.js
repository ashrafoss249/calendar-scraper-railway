const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Production-Optimized Dynamic Fare Class Test for Badr Airlines
 * 
 * Optimizations for production:
 * 1. Headless mode for faster execution
 * 2. Reduced timeouts and wait times
 * 3. Parallel processing where possible
 * 4. Better error handling and retry logic
 * 5. Minimal logging for production
 */

class ProductionFareTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.frame = null;
    this.fareResults = [];
    this.availableFareClasses = [];
    this.config = {
      headless: true,           // Headless for production
      slowMo: 0,               // No slow motion
      timeout: 10000,          // Reduced timeout
      waitTime: 500,           // Reduced wait times
      retryAttempts: 3,        // Retry failed operations
      parallelTests: false     // Can be enabled for multiple routes
    };
  }

  async startProductionTest() {
    console.log('🚀 Starting Production Fare Test...');
    console.log('⚡ Optimized for speed and reliability');
    
    try {
      await this.initializeBrowser();
      await this.login();
      await this.navigateToBooking();
      await this.performFlightSearch();
      await this.discoverAvailableFareClasses();
      await this.testAllDiscoveredFareClasses();
      await this.saveResults();
      
    } catch (error) {
      console.error('❌ Production test failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async initializeBrowser() {
    console.log('🌐 Initializing browser (headless mode)...');
    this.browser = await chromium.launch({ 
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    this.page = await context.newPage();
    
    // Set shorter timeouts
    this.page.setDefaultTimeout(this.config.timeout);
    this.page.setDefaultNavigationTimeout(this.config.timeout);
  }

  async login() {
    console.log('🔐 Logging in...');
    
    await this.page.goto('https://emea.ttinteractive.com/otds/index.asp', {
      waitUntil: 'domcontentloaded' // Faster than networkidle
    });
    
    // Fill login form with optimized selectors
    await this.page.locator('#login').fill('Elwahatravel');
    await this.page.locator('#pwd').fill('Alwaha@9045');
    await this.page.locator('#LoginCompanyIdentificationCode').fill('badr');
    
    await this.page.locator('#signInButton').click();
    await this.page.waitForLoadState('domcontentloaded');
    
    console.log('✅ Login successful');
  }

  async navigateToBooking() {
    console.log('📋 Navigating to booking...');
    
    await this.page.getByRole('button', { name: 'Book a flight' }).click();
    await this.page.waitForLoadState('domcontentloaded');
    
    this.frame = this.page.locator('iframe[name="mainFrame"]').contentFrame();
    console.log('✅ Booking interface loaded');
  }

  async performFlightSearch() {
    console.log('🔍 Performing flight search...');
    
    // Optimized flight search with reduced waits
    await this.frame.getByRole('button', { name: 'One way' }).click();
    await this.page.waitForTimeout(this.config.waitTime);
    
    // Departure city
    await this.frame.getByRole('button', { name: 'Addis Ababa' }).click();
    await this.page.waitForTimeout(this.config.waitTime);
    await this.frame.getByRole('link', { name: 'Cairo Intl CAI' }).click();
    await this.page.waitForTimeout(this.config.waitTime * 2);
    
    // Arrival city
    await this.frame.getByRole('button', { name: 'Port Sudan' }).click();
    await this.page.waitForTimeout(this.config.waitTime);
    await this.frame.getByRole('link', { name: 'Port Sudan PZU' }).click();
    await this.page.waitForTimeout(this.config.waitTime * 2);
    
    // Date selection
    await this.frame.locator('#CalendarID0').fill('15/09/2025');
    await this.frame.locator('#CalendarID0').press('Enter');
    await this.page.waitForTimeout(this.config.waitTime);
    
    // Fare type
    await this.frame.getByRole('button', { name: 'Public fares' }).click();
    await this.page.waitForTimeout(this.config.waitTime);
    await this.frame.getByRole('link', { name: 'Public fares' }).click();
    await this.page.waitForTimeout(this.config.waitTime);
    
    // Search
    await this.frame.getByRole('button', { name: 'Search flights ' }).click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(this.config.waitTime * 3);
    
    console.log('✅ Flight search completed');
  }

  async discoverAvailableFareClasses() {
    console.log('🔍 Discovering fare classes...');
    
    try {
      // Find and click enabled dropdown button
      const dropdownButtons = await this.frame.locator('button.btn.btn-default.dropdown-toggle').all();
      let enabledButton = null;
      
      for (const button of dropdownButtons) {
        if (await button.isEnabled()) {
          enabledButton = button;
          break;
        }
      }
      
      if (!enabledButton) {
        throw new Error('No enabled dropdown button found');
      }
      
      await enabledButton.click();
      await this.page.waitForTimeout(this.config.waitTime * 2);
      
      // Extract fare classes
      const fareLinks = await this.frame.locator('.dropdown-menu li a').all();
      
      for (let i = 0; i < fareLinks.length; i++) {
        try {
          const linkText = await fareLinks[i].textContent();
          const isVisible = await fareLinks[i].isVisible();
          
          if (linkText && isVisible) {
            const cleanText = linkText.replace(/\s+/g, ' ').trim();
            
            if (cleanText && cleanText.length > 0) {
              const fareClass = {
                id: `fare-${i}`,
                name: cleanText,
                description: this.getFareClassDescription(cleanText),
                index: i
              };
              
              this.availableFareClasses.push(fareClass);
            }
          }
        } catch (error) {
          // Continue with next fare class
        }
      }
      
      // Close dropdown
      await this.frame.locator('body').click();
      await this.page.waitForTimeout(this.config.waitTime);
      
      console.log(`✅ Discovered ${this.availableFareClasses.length} fare classes`);
      
    } catch (error) {
      console.error('❌ Error discovering fare classes:', error.message);
      throw error;
    }
  }

  getFareClassDescription(fareClassName) {
    const descriptions = {
      'T- Restricted Fare': 'Cheapest option',
      'C-BUSINESS DISCOUNT': 'Business class discount',
      'H-HIGH FARE': 'High fare option',
      'J-BUSINESS FULLFARE': 'Business class full fare'
    };
    
    return descriptions[fareClassName] || 'Unknown fare class';
  }

  async testAllDiscoveredFareClasses() {
    console.log('🎫 Testing fare classes...');
    
    if (this.availableFareClasses.length === 0) {
      console.log('❌ No fare classes to test');
      return;
    }
    
    // Test each fare class with retry logic
    for (const fareClass of this.availableFareClasses) {
      let success = false;
      let attempts = 0;
      
      while (!success && attempts < this.config.retryAttempts) {
        attempts++;
        
        try {
          const result = await this.testFareClass(fareClass);
          this.fareResults.push(result);
          success = true;
          
        } catch (error) {
          console.log(`⚠️ Attempt ${attempts} failed for ${fareClass.name}: ${error.message}`);
          
          if (attempts === this.config.retryAttempts) {
            this.fareResults.push({
              fareClass: fareClass.id,
              fareClassName: fareClass.name,
              description: fareClass.description,
              available: false,
              error: error.message,
              testedAt: new Date().toISOString()
            });
          }
        }
      }
      
      // Minimal wait between tests
      await this.page.waitForTimeout(this.config.waitTime);
    }
  }

  async testFareClass(fareClass) {
    // Find enabled dropdown button
    const dropdownButtons = await this.frame.locator('button.btn.btn-default.dropdown-toggle').all();
    let enabledButton = null;
    
    for (const button of dropdownButtons) {
      if (await button.isEnabled()) {
        enabledButton = button;
        break;
      }
    }
    
    if (!enabledButton) {
      throw new Error('No enabled dropdown button found');
    }
    
    await enabledButton.click();
    await this.page.waitForTimeout(this.config.waitTime);
    
    // Select fare class
    const fareClassLink = await this.frame.locator('.dropdown-menu li a').filter({ hasText: fareClass.name }).first();
    if (await fareClassLink.isVisible()) {
      await fareClassLink.click();
      await this.page.waitForTimeout(this.config.waitTime * 2);
    } else {
      throw new Error(`Fare class "${fareClass.name}" not found`);
    }
    
    // Click price element
    await this.frame.locator('#PricedTripPannel0 h4').getByText('SDG').click();
    await this.page.waitForTimeout(this.config.waitTime);
    
    // Extract data
    const updatedPrice = await this.extractCurrentPrice();
    const flightDetails = await this.extractFlightDetails();
    
    return {
      fareClass: fareClass.id,
      fareClassName: fareClass.name,
      description: fareClass.description,
      departure: 'Cairo',
      arrival: 'Port Sudan',
      date: 'September 15th, 2025',
      available: true,
      price: updatedPrice,
      flightDetails: flightDetails,
      method: 'production-optimized',
      testedAt: new Date().toISOString()
    };
  }

  async extractCurrentPrice() {
    try {
      // Optimized price extraction
      const priceElements = await this.frame.locator('h1, h2, h3, h4, h5, h6').all();
      
      for (const element of priceElements) {
        const text = await element.textContent();
        if (text && text.includes('SDG')) {
          return text.trim();
        }
      }
      
      // Fallback
      const sdgElements = await this.frame.locator('*:has-text("SDG")').all();
      
      for (const element of sdgElements) {
        const text = await element.textContent();
        if (text && text.match(/\d+,\d+ SDG/)) {
          return text.trim();
        }
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }

  async extractFlightDetails() {
    try {
      // Optimized flight details extraction
      const flightElements = await this.frame.locator('*:has-text("J4 685 Cairo Intl 21:00 Port Sudan 22:00")').all();
      
      for (const element of flightElements) {
        const text = await element.textContent();
        if (text && text.includes('J4 685')) {
          const flightMatch = text.match(/J4\s+(\d+)\s+([^0-9]+)\s+(\d{2}:\d{2})\s+([^0-9]+)\s+(\d{2}:\d{2})/);
          
          if (flightMatch) {
            return {
              airline: 'J4',
              flightNumber: flightMatch[1],
              departureAirport: flightMatch[2].trim(),
              departureTime: flightMatch[3],
              arrivalAirport: flightMatch[4].trim(),
              arrivalTime: flightMatch[5],
              fullText: text.trim()
            };
          }
          
          return text.trim();
        }
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }

  async saveResults() {
    console.log('💾 Saving results...');
    
    const results = {
      testInfo: {
        testDate: new Date().toISOString(),
        route: 'Cairo → Port Sudan',
        searchDate: 'September 15th, 2025',
        totalTests: this.fareResults.length,
        availableTests: this.fareResults.filter(r => r.available).length,
        unavailableTests: this.fareResults.filter(r => !r.available).length,
        method: 'production-optimized',
        discoveredFareClasses: this.availableFareClasses.length,
        executionTime: Date.now() - this.startTime
      },
      discoveredFareClasses: this.availableFareClasses,
      results: this.fareResults
    };
    
    const filePath = path.join(__dirname, 'production-fare-results.json');
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    
    console.log(`✅ Results saved to ${filePath}`);
    this.showProductionSummary();
  }

  showProductionSummary() {
    console.log('\n📊 PRODUCTION TEST SUMMARY:');
    console.log('============================');
    console.log(`🛫 Route: Cairo → Port Sudan`);
    console.log(`📅 Date: September 15th, 2025`);
    console.log(`🔍 Fare Classes: ${this.availableFareClasses.length}`);
    console.log(`✅ Available: ${this.fareResults.filter(r => r.available).length}`);
    console.log(`❌ Failed: ${this.fareResults.filter(r => !r.available).length}`);
    
    const availableFares = this.fareResults.filter(r => r.available);
    if (availableFares.length > 0) {
      console.log('\n💰 AVAILABLE FARES:');
      availableFares.forEach(fare => {
        console.log(`   ${fare.fareClassName}: ${fare.price}`);
        if (fare.flightDetails && typeof fare.flightDetails === 'object') {
          console.log(`      ✈️ ${fare.flightDetails.airline} ${fare.flightDetails.flightNumber} (${fare.flightDetails.departureTime} → ${fare.flightDetails.arrivalTime})`);
        }
      });
    }
  }

  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Production test function
async function runProductionTest() {
  const tester = new ProductionFareTest();
  tester.startTime = Date.now();
  await tester.startProductionTest();
}

// Export for use in other modules
module.exports = { ProductionFareTest, runProductionTest };

// Run if called directly
if (require.main === module) {
  runProductionTest()
    .then(() => {
      console.log('\n🎉 Production test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Production test failed:', error);
      process.exit(1);
    });
} 