const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
let db;

function initDatabase() {
  try {
    // Use a writable path for Railway
    const dbPath = process.env.NODE_ENV === 'production' 
      ? '/tmp/eco4_surveys.db' 
      : path.join(__dirname, 'eco4_surveys.db');
    
    db = new Database(dbPath);
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS surveys (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        property_address TEXT NOT NULL,
        property_type TEXT NOT NULL,
        heating_system TEXT NOT NULL,
        survey_date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS survey_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survey_id TEXT NOT NULL,
        detail_type TEXT NOT NULL,
        detail_value TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (survey_id) REFERENCES surveys (id)
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

// API Routes

// Get all surveys
app.get('/api/surveys', (req, res) => {
  try {
    const stmt = db.prepare(`SELECT * FROM surveys ORDER BY created_at DESC`);
    const surveys = stmt.all();
    res.json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Get single survey with details
app.get('/api/surveys/:id', (req, res) => {
  try {
    const surveyId = req.params.id;
    
    const surveyStmt = db.prepare(`SELECT * FROM surveys WHERE id = ?`);
    const survey = surveyStmt.get(surveyId);

    if (!survey) {
      res.status(404).json({ error: 'Survey not found' });
      return;
    }

    const detailsStmt = db.prepare(`SELECT * FROM survey_details WHERE survey_id = ?`);
    const details = detailsStmt.all(surveyId);
    
    res.json({ survey, details });
  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ error: 'Failed to fetch survey' });
  }
});

// Create new survey
app.post('/api/surveys', (req, res) => {
  try {
    const surveyId = uuidv4();
    const {
      customer_name, property_address, property_type, heating_system, survey_date, notes
    } = req.body;

    const stmt = db.prepare(`INSERT INTO surveys (
      id, customer_name, property_address, property_type, heating_system, survey_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`);

    stmt.run(
      surveyId, customer_name, property_address, property_type, heating_system, survey_date, notes
    );
    
    // Emit real-time update to all connected clients
    io.emit('survey_created', { id: surveyId, message: 'New survey created' });
    
    res.json({ id: surveyId, message: 'Survey created successfully' });
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ error: 'Failed to create survey' });
  }
});

// Update survey
app.put('/api/surveys/:id', (req, res) => {
  try {
    const surveyId = req.params.id;
    const {
      customer_name, property_address, property_type, heating_system, survey_date, status, notes
    } = req.body;

    const stmt = db.prepare(`UPDATE surveys SET 
      customer_name = ?, property_address = ?, property_type = ?, heating_system = ?,
      survey_date = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`);

    stmt.run(
      customer_name, property_address, property_type, heating_system,
      survey_date, status, notes, surveyId
    );
    
    // Emit real-time update
    io.emit('survey_updated', { id: surveyId, message: 'Survey updated' });
    
    res.json({ message: 'Survey updated successfully' });
  } catch (error) {
    console.error('Error updating survey:', error);
    res.status(500).json({ error: 'Failed to update survey' });
  }
});

// Delete survey
app.delete('/api/surveys/:id', (req, res) => {
  try {
    const surveyId = req.params.id;
    
    const deleteDetailsStmt = db.prepare(`DELETE FROM survey_details WHERE survey_id = ?`);
    const deleteSurveyStmt = db.prepare(`DELETE FROM surveys WHERE id = ?`);
    
    deleteDetailsStmt.run(surveyId);
    deleteSurveyStmt.run(surveyId);
    
    // Emit real-time update
    io.emit('survey_deleted', { id: surveyId, message: 'Survey deleted' });
    
    res.json({ message: 'Survey deleted successfully' });
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({ error: 'Failed to delete survey' });
  }
});

  // Add survey details
  app.post('/api/surveys/:id/details', (req, res) => {
    try {
      const surveyId = req.params.id;
      const {
        detail_type,
        detail_value
      } = req.body;

      const stmt = db.prepare(`INSERT INTO survey_details (
        survey_id, detail_type, detail_value
      ) VALUES (?, ?, ?)`);

      const result = stmt.run(surveyId, detail_type, detail_value);

      // Emit real-time update
      io.emit('survey_detail_added', { surveyId, detailId: result.lastInsertRowid, message: 'Survey detail added' });

      res.json({ id: result.lastInsertRowid, message: 'Survey detail added successfully' });
    } catch (error) {
      console.error('Error adding survey detail:', error);
      res.status(500).json({ error: 'Failed to add survey detail' });
    }
  });

// Get dashboard statistics
app.get('/api/dashboard', (req, res) => {
  try {
    const stats = {
      totalSurveys: 0,
      byStatus: [],
      recentSurveys: []
    };
    
    // Total surveys
    const totalSurveysStmt = db.prepare(`SELECT COUNT(*) as total FROM surveys`);
    const totalSurveys = totalSurveysStmt.get();
    stats.totalSurveys = totalSurveys.total;
    
    // Surveys by status
    const byStatusStmt = db.prepare(`SELECT status, COUNT(*) as count FROM surveys GROUP BY status`);
    const byStatus = byStatusStmt.all();
    stats.byStatus = byStatus;
    
    // Recent surveys
    const recentSurveysStmt = db.prepare(`SELECT * FROM surveys ORDER BY created_at DESC LIMIT 5`);
    const recentSurveys = recentSurveysStmt.all();
    stats.recentSurve URL: `https://your-app-name.railway.app`

// Initialize database
initDatabase();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server - accessible on all network interfaces
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // This makes it accessible from other networks

server.listen(PORT, HOST, () => {
  console.log(`ECO4 Survey CRM Server running on http://${HOST}:${PORT}`);
  console.log(`Access from other devices using your computer's IP address`);
  console.log(`Example: http://192.168.1.xxx:${PORT}`);
  if (process.env.PORT) {
    console.log(`🌐 Public URL available at: https://your-app-name.railway.app (or similar)`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
