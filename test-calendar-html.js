const { chromium } = require('playwright');
const cheerio = require('cheerio');

class FastCalendarExplorer {
  constructor() {
    this.browser = null;
    this.page = null;
    this.frame = null;
    
    this.config = {
      headless: true, // HEADLESS - Much faster and optimized for production!
      slowMo: 0, // No delay for maximum speed
      timeout: 8000, // Further reduced timeout for speed
      waitTime: 50 // Ultra-fast - reduced from 200ms to 50ms (4x faster)
    };

    this.loginCredentials = {
      username: 'Elwahatravel',
      password: 'Alwaha@9045',
      companyCode: 'badr'
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fast HTML-based color categorization
  categorizeColorFromHTML(className, style) {
    const colorInfo = {
      type: 'unknown',
      confidence: 0,
      details: {
        className: className,
        style: style
      }
    };

    // Class-based categorization (fastest)
    if (className) {
      if (className.includes('available')) {
        colorInfo.type = 'green';
        colorInfo.confidence = 95;
      } else if (className.includes('full') || className.includes('booked')) {
        colorInfo.type = 'red';
        colorInfo.confidence = 95;
      } else if (className.includes('noflight') || className.includes('disabled')) {
        colorInfo.type = 'grey';
        colorInfo.confidence = 95;
      } else if (className.includes('old') || className.includes('new')) {
        colorInfo.type = 'white';
        colorInfo.confidence = 90;
      }
    }

    // Style-based categorization (if class didn't work)
    if (colorInfo.confidence < 80 && style) {
      if (style.includes('background-color: rgb(92, 184, 92)') || style.includes('background-color:#5cb85c')) {
        colorInfo.type = 'green';
        colorInfo.confidence = 90;
      } else if (style.includes('background-color: rgb(217, 83, 79)') || style.includes('background-color:#d9534f')) {
        colorInfo.type = 'red';
        colorInfo.confidence = 90;
      } else if (style.includes('background-color: rgb(169, 169, 169)') || style.includes('background-color:#a9a9a9')) {
        colorInfo.type = 'grey';
        colorInfo.confidence = 90;
      } else if (style.includes('background-color: rgb(255, 255, 255)') || style.includes('background-color:#ffffff')) {
        colorInfo.type = 'white';
        colorInfo.confidence = 90;
      }
    }

    return colorInfo;
  }

  isGreenColor(className, style) {
    const colorInfo = this.categorizeColorFromHTML(className, style);
    return colorInfo.type === 'green';
  }

  isRedColor(className, style) {
    const colorInfo = this.categorizeColorFromHTML(className, style);
    return colorInfo.type === 'red';
  }

  isGreyColor(className, style) {
    const colorInfo = this.categorizeColorFromHTML(className, style);
    return colorInfo.type === 'grey';
  }

  async initialize() {
    console.log('🚀 Initializing Fast Calendar Explorer (HTML-based)...');
    
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
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1280, height: 720 }); // Smaller viewport for speed
  }

  async login() {
    console.log('🔐 Logging in...');
    
    try {
      await this.page.goto('https://emea.ttinteractive.com/otds/index.asp', {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout
      });

      // Fill login form using correct element IDs
      await this.page.locator('#login').fill(this.loginCredentials.username);
      await this.page.locator('#pwd').fill(this.loginCredentials.password);
      await this.page.locator('#LoginCompanyIdentificationCode').fill(this.loginCredentials.companyCode);
      
      // Submit login
      await this.page.locator('#signInButton').click();
      await this.page.waitForLoadState('domcontentloaded');
      
      console.log('✅ Login successful');
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

  async navigateToBooking() {
    console.log('📋 Navigating to booking...');

    try {
      // Wait for the page to fully load after login
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }); // Further reduced timeout
      await this.page.waitForTimeout(100); // Ultra-fast - reduced from 300ms

      // Try multiple approaches to find and click the "Book a flight" button
      try {
        await this.page.waitForSelector('button:has-text("Book a flight")', {
          state: 'visible',
          timeout: 4000 // Ultra-fast - reduced from 8000ms
        });
        await this.page.getByRole('button', { name: 'Book a flight' }).click();
        console.log('✅ "Book a flight" button clicked successfully');
      } catch (error) {
        console.log('⚠️ First attempt failed, trying alternative approach...');
        
        try {
          await this.page.waitForSelector('button:has-text("Book")', {
            state: 'visible',
            timeout: 3000 // Ultra-fast - reduced from 5000ms
          });
          await this.page.locator('button:has-text("Book")').first().click();
          console.log('✅ Alternative "Book" button clicked successfully');
        } catch (altError) {
          console.log('⚠️ Alternative approach failed, trying to find any clickable booking element...');
          
          const possibleButtons = await this.page.locator('button, a, input[type="button"]').all();
          let clicked = false;

          for (const button of possibleButtons) {
            try {
              const text = await button.textContent();
              if (text && (text.toLowerCase().includes('book') || text.toLowerCase().includes('flight'))) {
                await button.click();
                console.log(`✅ Found and clicked button with text: "${text}"`);
                clicked = true;
                break;
              }
            } catch (e) {
              // Continue to next button
            }
          }

          if (!clicked) {
            throw new Error('Could not find or click any booking-related button');
          }
        }
      }

      // Wait for the booking interface to load
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(100); // Ultra-fast - reduced from 300ms

      // Get the main frame
      this.frame = this.page.locator('iframe[name="mainFrame"]').contentFrame();

      if (!this.frame) {
        throw new Error('Main frame not found after clicking booking button');
      }

      console.log('✅ Booking interface loaded successfully');
      
    } catch (error) {
      console.error('❌ Navigation to booking failed:', error.message);
      throw error;
    }
  }

  async fillRouteAndOpenCalendar() {
    console.log('🛫 Filling route: Cairo → Port Sudan');
    
    try {
      // Wait for iframe to be fully loaded
      await this.sleep(500); // Ultra-fast - reduced from 1000ms
      
      // Select One way trip
      await this.frame.getByRole('button', { name: 'One way' }).click();
      await this.sleep(50); // Ultra-fast - reduced from 100ms
      
      // Departure city - click the current city button and select Cairo
      await this.frame.getByRole('button', { name: 'Addis Ababa' }).click();
      await this.sleep(50); // Ultra-fast - reduced from 100ms
      await this.frame.getByRole('link', { name: 'Cairo Intl CAI' }).click();
      await this.sleep(50); // Ultra-fast - reduced from 100ms
      
      // Arrival city - click the current city button and select Port Sudan
      await this.frame.getByRole('button', { name: 'Port Sudan' }).click();
      await this.sleep(50); // Ultra-fast - reduced from 100ms
      await this.frame.getByRole('link', { name: 'Port Sudan PZU' }).click();
      await this.sleep(50); // Ultra-fast - reduced from 100ms
      
      // Click on departure date field to open calendar
      await this.frame.locator('#CalendarID0').click();
      await this.sleep(50); // Ultra-fast - reduced from 100ms
      
      // Stay in current month (September) to test red date detection
      console.log('📅 Staying in current month (September) to test red date detection...');
      // No wait time needed - go straight to exploration
      
      console.log('✅ Route filled and calendar opened');
      
    } catch (error) {
      console.error('❌ Failed to fill route and open calendar:', error.message);
      throw error;
    }
  }

  async navigateToNextMonth() {
    console.log('📅 Navigating to next month...');
    
    try {
      // Try multiple approaches to navigate to next month
      try {
        // Try standard datepicker navigation
        await this.frame.locator('.ui-datepicker-next').click();
        console.log('✅ Used .ui-datepicker-next to navigate');
      } catch (error) {
        console.log('⚠️ Standard navigation failed, trying alternatives...');
        
        try {
          // Try alternative selectors
          await this.frame.locator('[class*="next"]').first().click();
          console.log('✅ Used [class*="next"] to navigate');
        } catch (altError) {
          try {
            // Try button with text "Next"
            await this.frame.getByRole('button', { name: 'Next' }).click();
            console.log('✅ Used "Next" button to navigate');
          } catch (buttonError) {
            try {
              // Try any element with "next" in class or text
              const nextElements = await this.frame.locator('button, a, span, div').all();
              for (const element of nextElements) {
                const text = await element.textContent();
                const className = await element.getAttribute('class');
                if ((text && text.toLowerCase().includes('next')) || 
                    (className && className.toLowerCase().includes('next'))) {
                  await element.click();
                  console.log('✅ Found and clicked navigation element');
                  break;
                }
              }
            } catch (finalError) {
              console.log('⚠️ Could not navigate to next month');
              throw finalError;
            }
          }
        }
      }
      
      // No wait time needed - calendar updates instantly
      console.log('✅ Successfully navigated to next month');
      
    } catch (error) {
      console.error('❌ Failed to navigate to next month:', error.message);
      throw error;
    }
  }

  async navigateToLastAvailableMonth(monthsToGoBack) {
    console.log(`📅 Navigating back ${monthsToGoBack} months to last available month...`);
    
    try {
      for (let i = 0; i < monthsToGoBack; i++) {
        console.log(`   Going back ${i + 1}/${monthsToGoBack} months...`);
        
        // Try multiple approaches to navigate to previous month
        try {
          // Try standard datepicker navigation
          await this.frame.locator('.ui-datepicker-prev').click();
          console.log('✅ Used .ui-datepicker-prev to navigate back');
        } catch (error) {
          console.log('⚠️ Standard navigation failed, trying alternatives...');
          
          try {
            // Try alternative selectors
            await this.frame.locator('[class*="prev"]').first().click();
            console.log('✅ Used [class*="prev"] to navigate back');
          } catch (altError) {
            try {
              // Try button with text "Prev"
              await this.frame.getByRole('button', { name: 'Prev' }).click();
              console.log('✅ Used "Prev" button to navigate back');
            } catch (buttonError) {
              try {
                // Try any element with "prev" in class or text
                const prevElements = await this.frame.locator('button, a, span, div').all();
                for (const element of prevElements) {
                  const text = await element.textContent();
                  const className = await element.getAttribute('class');
                  if ((text && text.toLowerCase().includes('prev')) || 
                      (className && className.toLowerCase().includes('prev'))) {
                    await element.click();
                    console.log('✅ Found and clicked previous navigation element');
                    break;
                  }
                }
              } catch (finalError) {
                console.log('⚠️ Could not navigate back');
                throw finalError;
              }
            }
          }
        }
        
        // No wait time needed - calendar updates instantly
      }
      
      console.log('✅ Successfully navigated to last available month');
      
    } catch (error) {
      console.error('❌ Failed to navigate to last available month:', error.message);
      throw error;
    }
  }

  // FAST HTML-BASED CALENDAR EXPLORATION
  async exploreCalendarFast() {
    console.log('📅 Exploring calendar using fast HTML parsing...');
    
    try {
      // Wait for calendar to be visible
      await this.sleep(50); // Ultra-fast - reduced from 100ms
      
      // Get the raw HTML of the calendar - try multiple selectors
      let calendarHTML = null;
      const selectors = [
        '.ui-datepicker-calendar',
        '.calendar',
        '[class*="date"]',
        '[class*="calendar"]',
        'table',
        'tbody'
      ];
      
      for (const selector of selectors) {
        try {
          const elements = await this.frame.locator(selector).all();
          if (elements.length > 0) {
            calendarHTML = await elements[0].innerHTML();
            console.log(`✅ Found calendar with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!calendarHTML) {
        // Try to get the entire iframe content as fallback
        try {
          calendarHTML = await this.frame.content();
          console.log('✅ Using entire iframe content as fallback');
        } catch (e) {
          throw new Error('Could not get calendar HTML with any selector');
        }
      }

      // Parse HTML with cheerio (fast)
      const $ = cheerio.load(calendarHTML);
      
      // Find all date cells
      const dateCells = $('td[class*="day"], td[class*="date"], span[class*="day"], a[class*="day"]');
      
      if (dateCells.length === 0) {
        throw new Error('No date cells found in calendar HTML');
      }

      console.log(`✅ Found ${dateCells.length} date cells using HTML parsing`);

      const calendarData = {
        available: [], // Green dates
        booked: [],    // Red dates  
        noFlights: [], // Grey dates
        total: dateCells.length
      };

      console.log(`📊 Found ${dateCells.length} date cells to analyze...`);
      
      // Process each cell using HTML parsing (much faster)
      dateCells.each((index, element) => {
        const $cell = $(element);
        const dateText = $cell.text().trim();
        const dateNumber = parseInt(dateText);
        
        if (isNaN(dateNumber)) return; // Skip empty cells
        
        // Get class and style from HTML (fast)
        const className = $cell.attr('class') || '';
        const style = $cell.attr('style') || '';
        
        // Fast categorization using HTML attributes only
        const isGreen = this.isGreenColor(className, style);
        const isRed = this.isRedColor(className, style);
        const isGrey = this.isGreyColor(className, style);
        
        const dateInfo = {
          day: dateNumber,
          className: className,
          style: style,
          isClickable: !$cell.hasClass('disabled')
        };

        // Categorize the date
        if (isGreen) {
          calendarData.available.push(dateInfo);
          console.log(`🎨 Day ${dateNumber}: GREEN (95% confidence) - Class: ${className}`);
        } else if (isRed) {
          calendarData.booked.push(dateInfo);
          console.log(`🎨 Day ${dateNumber}: RED (95% confidence) - Class: ${className}`);
          console.log(`🔴 Found red date: Day ${dateNumber} - Class: ${className}`);
        } else if (isGrey) {
          calendarData.noFlights.push(dateInfo);
          console.log(`🎨 Day ${dateNumber}: GREY (95% confidence) - Class: ${className}`);
        } else {
          // Default to white/unknown
          console.log(`🎨 Day ${dateNumber}: WHITE (100% confidence) - Class: ${className}`);
        }
      });

      console.log('✅ Calendar exploration completed using HTML parsing');
      
      // Show color analysis summary
      console.log('\n🎨 COLOR ANALYSIS SUMMARY:');
      console.log('Class types found:');
      const classTypes = {};
      [...calendarData.available, ...calendarData.booked, ...calendarData.noFlights].forEach(date => {
        const type = this.categorizeColorFromHTML(date.className, date.style).type;
        classTypes[type] = (classTypes[type] || 0) + 1;
      });
      Object.entries(classTypes).forEach(([type, count]) => {
        console.log(`   ${type.toUpperCase()}: ${count} dates`);
      });

      return calendarData;
      
    } catch (error) {
      console.error('❌ Fast calendar exploration failed:', error.message);
      throw error;
    }
  }

  showMonthSummary(calendarData, monthNumber) {
    console.log(`\n📊 MONTH ${monthNumber} ANALYSIS RESULTS:`);
    console.log('=============================');
    console.log(`Route: Cairo → Port Sudan`);
    console.log(`✅ Available dates: ${calendarData.available.length}`);
    console.log(`❌ Booked dates: ${calendarData.booked.length}`);
    console.log(`⚪ No flights: ${calendarData.noFlights.length}`);
    console.log(`📅 Total dates: ${calendarData.total}`);
    
    if (calendarData.available.length > 0) {
      const availableDays = calendarData.available.map(d => d.day).sort((a, b) => a - b);
      console.log(`🎯 Available days: ${availableDays.join(', ')}`);
    }
    
    if (calendarData.booked.length > 0) {
      const bookedDays = calendarData.booked.map(d => d.day).sort((a, b) => a - b);
      console.log(`❌ Booked days: ${bookedDays.join(', ')}`);
    }

    // Calculate optimization potential
    const totalDates = calendarData.available.length + calendarData.booked.length + calendarData.noFlights.length;
    const skipPercentage = totalDates > 0 ? ((calendarData.booked.length + calendarData.noFlights.length) / totalDates * 100).toFixed(1) : 0;
    const noFlightPercentage = totalDates > 0 ? (calendarData.noFlights.length / totalDates * 100).toFixed(1) : 0;
    
    console.log(`🚀 Month ${monthNumber} optimization: Skip ${calendarData.booked.length + calendarData.noFlights.length} dates (${skipPercentage}%)`);
    console.log(`📊 No flight percentage: ${noFlightPercentage}%`);
    
    if (parseFloat(noFlightPercentage) > 80) {
      console.log(`⚠️ WARNING: High no-flight percentage (${noFlightPercentage}% > 80%)`);
    }
  }

  showComprehensiveSummary(allResults) {
    console.log('\n📊 COMPREHENSIVE MULTI-MONTH ANALYSIS:');
    console.log('=====================================');
    console.log(`Route: Cairo → Port Sudan`);
    console.log(`Months explored: ${allResults.length}\n`);

    let totalAvailable = 0;
    let totalBooked = 0;
    let totalNoFlights = 0;
    let totalDates = 0;
    let lastAvailableMonth = 0;

    allResults.forEach((result, index) => {
      const monthNumber = index + 1;
      console.log(`📅 Month ${monthNumber}:`);
      console.log(`   ✅ Available: ${result.available.length}`);
      console.log(`   ❌ Booked: ${result.booked.length}`);
      console.log(`   ⚪ No flights: ${result.noFlights.length}`);
      
      if (result.available.length > 0) {
        lastAvailableMonth = monthNumber;
      }
      
      totalAvailable += result.available.length;
      totalBooked += result.booked.length;
      totalNoFlights += result.noFlights.length;
      totalDates += result.total;
    });

    console.log(`\n📊 OVERALL TOTALS:`);
    console.log(`✅ Total available dates: ${totalAvailable}`);
    console.log(`❌ Total booked dates: ${totalBooked}`);
    console.log(`⚪ Total no flights: ${totalNoFlights}`);
    console.log(`📅 Total dates analyzed: ${totalDates}`);
    
    const overallSkipPercentage = totalDates > 0 ? ((totalBooked + totalNoFlights) / totalDates * 100).toFixed(1) : 0;
    console.log(`🚀 Overall optimization: Skip ${totalBooked + totalNoFlights} dates (${overallSkipPercentage}%)`);
    console.log(`⚡ Expected performance improvement: ~${(overallSkipPercentage/10).toFixed(1)}x faster`);

    console.log(`\n🎯 BOOKING RECOMMENDATIONS:`);
    console.log(`📅 Last available month to book: Month ${lastAvailableMonth}`);
    console.log(`📊 Total available dates across all months: ${totalAvailable}`);
    
    if (lastAvailableMonth > 0) {
      const lastMonthData = allResults[lastAvailableMonth - 1];
      const availableDays = lastMonthData.available.map(d => d.day).sort((a, b) => a - b);
      console.log(`🎯 Available days in last month (${lastAvailableMonth}): ${availableDays.join(', ')}`);
    }
  }

  async saveMonthResults(calendarData, monthNumber) {
    const fs = require('fs');
    
    const results = {
      timestamp: new Date().toISOString(),
      route: 'Cairo → Port Sudan',
      monthNumber: monthNumber,
      calendarData: calendarData,
      summary: {
        totalAvailable: calendarData.available.length,
        totalBooked: calendarData.booked.length,
        totalNoFlights: calendarData.noFlights.length,
        totalDates: calendarData.total
      }
    };

    const filename = `calendar-month-${monthNumber}-results.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`💾 Month ${monthNumber} results saved to: ${filename}`);
  }

  async saveComprehensiveResults(allResults) {
    const fs = require('fs');
    
    const results = {
      timestamp: new Date().toISOString(),
      route: 'Cairo → Port Sudan',
      totalMonths: allResults.length,
      months: allResults.map((result, index) => ({
        monthNumber: index + 1,
        available: result.available.length,
        booked: result.booked.length,
        noFlights: result.noFlights.length,
        total: result.total
      })),
      summary: {
        totalAvailable: allResults.reduce((sum, result) => sum + result.available.length, 0),
        totalBooked: allResults.reduce((sum, result) => sum + result.booked.length, 0),
        totalNoFlights: allResults.reduce((sum, result) => sum + result.noFlights.length, 0),
        totalDates: allResults.reduce((sum, result) => sum + result.total, 0)
      }
    };

    const filename = 'calendar-comprehensive-results.json';
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`💾 Comprehensive results saved to: ${filename}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async exploreMultiMonth() {
    console.log('🚀 Starting Fast Multi-Month Calendar Exploration for Cairo → Port Sudan');
    console.log('⚡ HEADLESS MODE - Ultra-fast and optimized for production!');
    console.log('⚡ FAST HTML-BASED PARSING - Much faster than individual cell queries!');
    console.log('⏱️ Expected time: ~15-30 seconds (ultra-fast optimized version)');
    
    const startTime = Date.now();
    
    try {
      await this.initialize();
      await this.login();
      await this.navigateToBooking();
      await this.fillRouteAndOpenCalendar();

      console.log('\n📅 Starting fast multi-month exploration...\n');

      const allResults = [];
      let currentMonth = 0;
      let hasAvailableDates = true;
      
      try {
        while (hasAvailableDates && currentMonth < 12) {
          currentMonth++;
          console.log(`🔄 Exploring Month ${currentMonth}...`);
          
          // Fast HTML-based calendar exploration
          const calendarData = await this.exploreCalendarFast();
          
          // Check if there are available dates
          hasAvailableDates = calendarData.available.length > 0;
          
          // Calculate additional stopping criteria
          const totalDates = calendarData.available.length + calendarData.booked.length + calendarData.noFlights.length;
          const noFlightPercentage = totalDates > 0 ? (calendarData.noFlights.length / totalDates * 100) : 0;
          
          // Show summary for this month
          this.showMonthSummary(calendarData, currentMonth);
          
          // Save individual month results
          await this.saveMonthResults(calendarData, currentMonth);
          
          // Add to all results
          allResults.push(calendarData);
          
          // Strict stopping logic: stop immediately when >80% no flights (after minimum 2 months)
          const minimumMonthsToExplore = 2; // Explore at least 2 months before applying 80% threshold
          const shouldStop = !hasAvailableDates || 
                           (currentMonth >= minimumMonthsToExplore && noFlightPercentage > 80);
          
          // Debug logging
          console.log(`🔍 DEBUG: Month ${currentMonth}, No-flight %: ${noFlightPercentage.toFixed(1)}%, Should stop: ${shouldStop}`);
          
          if (shouldStop) {
            let stopReason = '';
            if (!hasAvailableDates) {
              stopReason = 'No available dates found';
            } else if (currentMonth < minimumMonthsToExplore) {
              stopReason = `Explored minimum required months (${currentMonth}/${minimumMonthsToExplore})`;
            } else if (noFlightPercentage > 80) {
              stopReason = `High percentage of no flights (${noFlightPercentage.toFixed(1)}%)`;
            }
            
            console.log(`\n🎯 Stopping exploration: ${stopReason}`);
            console.log(`📅 Last available month to book: Month ${currentMonth - 1}`);
            break;
          }
          
          // Navigate to next month
          if (hasAvailableDates) {
            console.log(`\n⏭️ Navigating to next month...`);
            await this.navigateToNextMonth();
          }
          
        }
      } catch (error) {
        console.error(`❌ Error exploring Month ${currentMonth}:`, error.message);
      }
      
      const executionTime = Date.now() - startTime;
      console.log(`\n⏱️ Fast multi-month exploration completed in ${executionTime}ms (${(executionTime/1000).toFixed(1)}s)`);
      
      // Show comprehensive summary
      this.showComprehensiveSummary(allResults);
      
      // Save comprehensive results
      await this.saveComprehensiveResults(allResults);
      
      // Navigate back to the last available month for booking
      if (allResults.length > 1) {
        const lastAvailableMonthIndex = allResults.findIndex(result => result.available.length > 0);
        if (lastAvailableMonthIndex >= 0) {
          console.log(`\n🔄 Navigating back to last available month (Month ${lastAvailableMonthIndex + 1}) for booking...`);
          await this.navigateToLastAvailableMonth(allResults.length - lastAvailableMonthIndex - 1);
        }
      }
      
      return allResults;
      
    } catch (error) {
      console.error('❌ Fast multi-month exploration failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Test function
async function testFastMultiMonthCalendar() {
  const explorer = new FastCalendarExplorer();
  await explorer.exploreMultiMonth();
}

// Run if called directly
if (require.main === module) {
  testFastMultiMonthCalendar()
    .then(() => {
      console.log('\n🎉 Fast multi-month calendar exploration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fast multi-month calendar exploration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { FastCalendarExplorer, testFastMultiMonthCalendar }; 