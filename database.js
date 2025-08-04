const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = process.env.DATABASE_URL || isProduction;

let db;

if (usePostgres) {
  // PostgreSQL for Railway/Production
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  });

  db = {
    query: (text, params) => pool.query(text, params),
    close: () => pool.end()
  };

  console.log('🗄️ Using PostgreSQL database');
} else {
  // SQLite for local development
  const dbPath = path.join(__dirname, 'calendar_data.db');
  db = new sqlite3.Database(dbPath);
  
  console.log('🗄️ Using SQLite database:', dbPath);
}

// Initialize database tables
async function initializeDatabase() {
  try {
    if (usePostgres) {
      // PostgreSQL table creation
      await db.query(`
        CREATE TABLE IF NOT EXISTS calendar_explorations (
          id SERIAL PRIMARY KEY,
          route VARCHAR(100) NOT NULL,
          total_months INTEGER NOT NULL,
          total_available INTEGER NOT NULL,
          total_booked INTEGER NOT NULL,
          total_no_flights INTEGER NOT NULL,
          last_available_month INTEGER NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          results JSONB NOT NULL
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS monthly_results (
          id SERIAL PRIMARY KEY,
          exploration_id INTEGER REFERENCES calendar_explorations(id),
          month_number INTEGER NOT NULL,
          available_dates JSONB NOT NULL,
          booked_dates JSONB NOT NULL,
          no_flight_dates JSONB NOT NULL,
          total_dates INTEGER NOT NULL,
          no_flight_percentage DECIMAL(5,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

    } else {
      // SQLite table creation
      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS calendar_explorations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route TEXT NOT NULL,
            total_months INTEGER NOT NULL,
            total_available INTEGER NOT NULL,
            total_booked INTEGER NOT NULL,
            total_no_flights INTEGER NOT NULL,
            last_available_month INTEGER NOT NULL,
            execution_time_ms INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            results TEXT NOT NULL
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS monthly_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exploration_id INTEGER,
            month_number INTEGER NOT NULL,
            available_dates TEXT NOT NULL,
            booked_dates TEXT NOT NULL,
            no_flight_dates TEXT NOT NULL,
            total_dates INTEGER NOT NULL,
            no_flight_percentage REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (exploration_id) REFERENCES calendar_explorations(id)
          )
        `);
      });
    }

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Store exploration results
async function storeExplorationResults(results, executionTime) {
  try {
    const summary = generateSummary(results);
    
    if (usePostgres) {
      // PostgreSQL insert
      const explorationResult = await db.query(`
        INSERT INTO calendar_explorations 
        (route, total_months, total_available, total_booked, total_no_flights, 
         last_available_month, execution_time_ms, results)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        'Cairo → Port Sudan',
        summary.totalMonths,
        summary.totalAvailable,
        summary.totalBooked,
        summary.totalNoFlights,
        summary.lastAvailableMonth,
        executionTime,
        JSON.stringify(results)
      ]);

      const explorationId = explorationResult.rows[0].id;

      // Store monthly results
      for (let i = 0; i < results.length; i++) {
        const monthData = results[i];
        const totalDates = monthData.available.length + monthData.booked.length + monthData.noFlights.length;
        const noFlightPercentage = totalDates > 0 ? (monthData.noFlights.length / totalDates * 100) : 0;

        await db.query(`
          INSERT INTO monthly_results 
          (exploration_id, month_number, available_dates, booked_dates, no_flight_dates, 
           total_dates, no_flight_percentage)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          explorationId,
          i + 1,
          JSON.stringify(monthData.available),
          JSON.stringify(monthData.booked),
          JSON.stringify(monthData.noFlights),
          totalDates,
          noFlightPercentage
        ]);
      }

    } else {
      // SQLite insert
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO calendar_explorations 
          (route, total_months, total_available, total_booked, total_no_flights, 
           last_available_month, execution_time_ms, results)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'Cairo → Port Sudan',
          summary.totalMonths,
          summary.totalAvailable,
          summary.totalBooked,
          summary.totalNoFlights,
          summary.lastAvailableMonth,
          executionTime,
          JSON.stringify(results)
        ], function(err) {
          if (err) {
            reject(err);
            return;
          }

          const explorationId = this.lastID;

          // Store monthly results
          let completed = 0;
          for (let i = 0; i < results.length; i++) {
            const monthData = results[i];
            const totalDates = monthData.available.length + monthData.booked.length + monthData.noFlights.length;
            const noFlightPercentage = totalDates > 0 ? (monthData.noFlights.length / totalDates * 100) : 0;

            db.run(`
              INSERT INTO monthly_results 
              (exploration_id, month_number, available_dates, booked_dates, no_flight_dates, 
               total_dates, no_flight_percentage)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              explorationId,
              i + 1,
              JSON.stringify(monthData.available),
              JSON.stringify(monthData.booked),
              JSON.stringify(monthData.noFlights),
              totalDates,
              noFlightPercentage
            ], function(err) {
              if (err) {
                reject(err);
                return;
              }
              completed++;
              if (completed === results.length) {
                resolve(explorationId);
              }
            });
          }
        });
      });
    }

    console.log('💾 Exploration results stored in database successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to store exploration results:', error);
    throw error;
  }
}

// Get latest exploration results
async function getLatestExplorationResults() {
  try {
    if (usePostgres) {
      const result = await db.query(`
        SELECT * FROM calendar_explorations 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return null;
      }

      const exploration = result.rows[0];
      const monthlyResults = await db.query(`
        SELECT * FROM monthly_results 
        WHERE exploration_id = $1 
        ORDER BY month_number
      `, [exploration.id]);

      return {
        exploration: exploration,
        monthlyResults: monthlyResults.rows
      };

    } else {
      return new Promise((resolve, reject) => {
        db.get(`
          SELECT * FROM calendar_explorations 
          ORDER BY created_at DESC 
          LIMIT 1
        `, (err, exploration) => {
          if (err) {
            reject(err);
            return;
          }

          if (!exploration) {
            resolve(null);
            return;
          }

          db.all(`
            SELECT * FROM monthly_results 
            WHERE exploration_id = ? 
            ORDER BY month_number
          `, [exploration.id], (err, monthlyResults) => {
            if (err) {
              reject(err);
              return;
            }

            resolve({
              exploration: exploration,
              monthlyResults: monthlyResults
            });
          });
        });
      });
    }
  } catch (error) {
    console.error('❌ Failed to get latest results:', error);
    throw error;
  }
}

// Get all explorations
async function getAllExplorations() {
  try {
    if (usePostgres) {
      const result = await db.query(`
        SELECT * FROM calendar_explorations 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      return result.rows;
    } else {
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM calendar_explorations 
          ORDER BY created_at DESC 
          LIMIT 10
        `, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }
  } catch (error) {
    console.error('❌ Failed to get all explorations:', error);
    throw error;
  }
}

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

module.exports = {
  db,
  initializeDatabase,
  storeExplorationResults,
  getLatestExplorationResults,
  getAllExplorations
}; 