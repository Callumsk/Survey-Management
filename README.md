# ECO4 Survey CRM - UK Grant Management System

A comprehensive Customer Relationship Management (CRM) system designed specifically for managing UK ECO4 grant surveys. This web application provides a modern, responsive interface for surveyors and administrators to track, manage, and report on energy efficiency surveys.

## 🌟 Features

### Core Functionality
- **Survey Management**: Create, view, edit, and delete surveys
- **Real-time Updates**: Live synchronization across all connected users
- **Dashboard Analytics**: Overview of survey statistics and recent activity
- **Search & Filter**: Advanced filtering by status, customer, and property details
- **Data Export**: Export survey data to CSV format
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### Survey Information Tracking
- Customer details (name, email, phone)
- Property information (address, type, current heating system)
- Survey scheduling and assignment
- Status tracking (pending, in-progress, completed, cancelled)
- Detailed notes and observations
- Room-by-room survey details with cost estimates

### Network Accessibility
- **Multi-network Access**: Configured to be accessible from other devices on the network
- **Real-time Collaboration**: Multiple users can work simultaneously
- **Persistent Data Storage**: SQLite database ensures data persistence
- **Live Updates**: Changes appear instantly for all connected users

## 🚀 Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone or download the project files**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Access the application**
   - Local access: `http://localhost:3000`
   - Network access: `http://[YOUR_COMPUTER_IP]:3000`

### Development Mode
For development with auto-restart on file changes:
```bash
npm run dev
```

## 🌐 **Deploy to Get a Public URL**

### **Option 1: Railway (Recommended - Free)**
1. **Sign up** at [railway.app](https://railway.app)
2. **Create a new project**
3. **Connect your GitHub repository** or upload files
4. **Railway will automatically detect** your Node.js app
5. **Get your public URL** (e.g., `https://eco4-crm.railway.app`)

### **Option 2: Render (Free Tier)**
1. **Sign up** at [render.com](https://render.com)
2. **Create a new Web Service**
3. **Connect your repository**
4. **Set build command**: `npm install`
5. **Set start command**: `npm start`
6. **Get your public URL** (e.g., `https://eco4-crm.onrender.com`)

### **Option 3: Heroku**
1. **Sign up** at [heroku.com](https://heroku.com)
2. **Install Heroku CLI**
3. **Run commands**:
   ```bash
   heroku create your-app-name
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

### **Option 4: VPS Hosting**
1. **Rent a VPS** (DigitalOcean, AWS, etc.)
2. **Install Node.js** on the server
3. **Upload your code** via Git or SCP
4. **Run**: `npm install && npm start`
5. **Configure domain** (optional)

## �� Project Structure

```
eco4-survey-crm/
├── server.js              # Main Express server with Socket.IO
├── package.json           # Dependencies and scripts
├── README.md             # This file
├── public/               # Frontend files
│   ├── index.html        # Main HTML file
│   ├── styles.css        # CSS styling
│   └── app.js           # Frontend JavaScript
└── eco4_surveys.db      # SQLite database (created automatically)
```

## 🔧 Configuration

### Network Access
The application is configured to run on all network interfaces (`0.0.0.0`) by default, making it accessible from other devices on your network.

To find your computer's IP address:
- **Windows**: Run `ipconfig` in Command Prompt
- **Mac/Linux**: Run `ifconfig` or `ip addr` in Terminal

### Port Configuration
The default port is 3000. To change it:
1. Set the `PORT` environment variable
2. Or modify the port in `server.js`

```bash
PORT=8080 npm start
```

## 📊 Database Schema

### Surveys Table
- `id` - Unique identifier
- `customer_name` - Customer's full name
- `customer_email` - Customer's email address
- `customer_phone` - Customer's phone number
- `property_address` - Property address
- `property_type` - Type of property (detached, semi-detached, etc.)
- `current_heating_system` - Current heating system type
- `survey_date` - Scheduled survey date
- `surveyor_name` - Assigned surveyor
- `status` - Survey status (pending, in-progress, completed, cancelled)
- `notes` - Additional notes
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Survey Details Table
- `id` - Unique identifier
- `survey_id` - Reference to survey
- `room_name` - Room name
- `room_type` - Room type
- `current_insulation` - Current insulation status
- `recommended_improvements` - Recommended improvements
- `estimated_cost` - Estimated cost of improvements
- `potential_savings` - Potential energy savings

## 🎯 Usage Guide

### Creating a New Survey
1. Navigate to "New Survey" in the sidebar
2. Fill in customer information
3. Add property details
4. Schedule survey date and assign surveyor
5. Add any relevant notes
6. Click "Create Survey"

### Managing Surveys
1. View all surveys in the "Surveys" section
2. Use search and filters to find specific surveys
3. Click "View" to see detailed information
4. Use "Edit" to modify survey details
5. Use "Delete" to remove surveys (with confirmation)

### Dashboard Overview
- Total survey count
- Surveys by status (pending, completed, in-progress)
- Recent survey activity
- Quick action buttons

### Real-time Features
- Live updates when surveys are created, updated, or deleted
- Connection status indicator
- Toast notifications for user feedback

## 🔒 Security Considerations

### For Production Use
- Implement user authentication and authorization
- Use HTTPS for secure data transmission
- Regular database backups
- Input validation and sanitization
- Rate limiting for API endpoints

### Current Implementation
- Basic input validation
- SQL injection protection through parameterized queries
- CORS configuration for cross-origin requests

## 🛠️ API Endpoints

### Surveys
- `GET /api/surveys` - Get all surveys
- `GET /api/surveys/:id` - Get specific survey with details
- `POST /api/surveys` - Create new survey
- `PUT /api/surveys/:id` - Update survey
- `DELETE /api/surveys/:id` - Delete survey

### Survey Details
- `POST /api/surveys/:id/details` - Add survey details

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

## 📱 Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (responsive design)

## 🐛 Troubleshooting

### Common Issues

**Application won't start**
- Check if Node.js is installed: `node --version`
- Ensure all dependencies are installed: `npm install`
- Check if port 3000 is available

**Can't access from other devices**
- Check Windows Firewall settings
- Ensure the application is running on `0.0.0.0`
- Verify the correct IP address is being used

**Database errors**
- Check file permissions for the database directory
- Ensure SQLite is properly installed
- Check for disk space issues

### Logs
The application logs connection status and errors to the console. Monitor these for troubleshooting.

## 🔄 Updates and Maintenance

### Regular Maintenance
- Monitor database size and performance
- Backup database regularly
- Update dependencies periodically
- Check for security updates

### Adding Features
The modular structure makes it easy to add new features:
- Add new API endpoints in `server.js`
- Extend the frontend in `public/app.js`
- Update the UI in `public/index.html` and `public/styles.css`

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Ensure all prerequisites are met
4. Verify network configuration

## 📄 License

This project is open source and available under the MIT License.

---

**Note**: This application is designed for internal use within organizations managing ECO4 grant surveys. For production deployment, consider implementing additional security measures and user authentication.
