@echo off
echo Starting ECO4 Survey CRM...
echo.
echo The application will be available at:
echo - Local: http://localhost:3001
echo - Network: http://[YOUR_IP_ADDRESS]:3001
echo.
echo To find your IP address, run: ipconfig
echo.
echo Press Ctrl+C to stop the server
echo.

set PORT=3001
node server.js

pause
