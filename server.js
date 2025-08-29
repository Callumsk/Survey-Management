const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./eco4_surveys.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Surveys table
    db.run(`CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT,
      property_address TEXT NOT NULL,
      property_type TEXT,
      current_heating_system TEXT,
      survey_date TEXT,
      surveyor_name TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Survey details table
    db.run(`CREATE TABLE IF NOT EXISTS survey_details (
      id TEXT PRIMARY KEY,
      survey_id TEXT,
      room_name TEXT,
      room_type TEXT,
      current_insulation TEXT,
      recommended_improvements TEXT,
      estimated_cost REAL,
      potential_savings REAL,
      FOREIGN KEY (survey_id) REFERENCES surveys (id)
    )`);

    // Users table for authentication
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'surveyor',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('Database tables initialized');
  });
}

// API Routes

// Get all surveys
app.get('/api/surveys', (req, res) => {
  db.all(`SELECT * FROM surveys ORDER BY created_at DESC`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single survey with details
app.get('/api/surveys/:id', (req, res) => {
  const surveyId = req.params.id;
  
  db.get(`SELECT * FROM surveys WHERE id = ?`, [surveyId], (err, survey) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!survey) {
      res.status(404).json({ error: 'Survey not found' });
      return;
    }

    db.all(`SELECT * FROM survey_details WHERE survey_id = ?`, [surveyId], (err, details) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({ survey, details });
    });
  });
});

// Create new survey
app.post('/api/surveys', (req, res) => {
  const surveyId = uuidv4();
  const {
    customer_name,
    customer_email,
    customer_phone,
    property_address,
    property_type,
    current_heating_system,
    survey_date,
    surveyor_name,
    notes
  } = req.body;

  const sql = `INSERT INTO surveys (
    id, customer_name, customer_email, customer_phone, property_address,
    property_type, current_heating_system, survey_date, surveyor_name, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    surveyId, customer_name, customer_email, customer_phone, property_address,
    property_type, current_heating_system, survey_date, surveyor_name, notes
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Emit real-time update to all connected clients
    io.emit('survey_created', { id: surveyId, message: 'New survey created' });
    
    res.json({ id: surveyId, message: 'Survey created successfully' });
  });
});

// Update survey
app.put('/api/surveys/:id', (req, res) => {
  const surveyId = req.params.id;
  const {
    customer_name,
    customer_email,
    customer_phone,
    property_address,
    property_type,
    current_heating_system,
    survey_date,
    surveyor_name,
    status,
    notes
  } = req.body;

  const sql = `UPDATE surveys SET 
    customer_name = ?, customer_email = ?, customer_phone = ?, property_address = ?,
    property_type = ?, current_heating_system = ?, survey_date = ?, surveyor_name = ?,
    status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`;

  db.run(sql, [
    customer_name, customer_email, customer_phone, property_address,
    property_type, current_heating_system, survey_date, surveyor_name,
    status, notes, surveyId
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Emit real-time update
    io.emit('survey_updated', { id: surveyId, message: 'Survey updated' });
    
    res.json({ message: 'Survey updated successfully' });
  });
});

// Delete survey
app.delete('/api/surveys/:id', (req, res) => {
  const surveyId = req.params.id;
  
  db.run(`DELETE FROM survey_details WHERE survey_id = ?`, [surveyId], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.run(`DELETE FROM surveys WHERE id = ?`, [surveyId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Emit real-time update
      io.emit('survey_deleted', { id: surveyId, message: 'Survey deleted' });
      
      res.json({ message: 'Survey deleted successfully' });
    });
  });
});

// Add survey details
app.post('/api/surveys/:id/details', (req, res) => {
  const surveyId = req.params.id;
  const detailId = uuidv4();
  const {
    room_name,
    room_type,
    current_insulation,
    recommended_improvements,
    estimated_cost,
    potential_savings
  } = req.body;

  const sql = `INSERT INTO survey_details (
    id, survey_id, room_name, room_type, current_insulation,
    recommended_improvements, estimated_cost, potential_savings
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [
    detailId, surveyId, room_name, room_type, current_insulation,
    recommended_improvements, estimated_cost, potential_savings
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Emit real-time update
    io.emit('survey_detail_added', { surveyId, detailId, message: 'Survey detail added' });
    
    res.json({ id: detailId, message: 'Survey detail added successfully' });
  });
});

// Get dashboard statistics
app.get('/api/dashboard', (req, res) => {
  const stats = {};
  
  // Total surveys
  db.get(`SELECT COUNT(*) as total FROM surveys`, (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    stats.totalSurveys = row.total;
    
    // Surveys by status
    db.all(`SELECT status, COUNT(*) as count FROM surveys GROUP BY status`, (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      stats.byStatus = rows;
      
      // Recent surveys
      db.all(`SELECT * FROM surveys ORDER BY created_at DESC LIMIT 5`, (err, recent) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        stats.recentSurveys = recent;
        
        res.json(stats);
      });
    });
  });
});

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
