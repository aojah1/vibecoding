# State Farm Live Portal 🏢

Real-time insurance claims analytics dashboard powered by Oracle Autonomous Database.

![Status](https://img.shields.io/badge/status-ready-green)
![Oracle](https://img.shields.io/badge/database-Oracle%20ADB-red)
![React](https://img.shields.io/badge/frontend-React-blue)
![Node](https://img.shields.io/badge/backend-Node.js-green)

---

## 🚀 Quick Start

### 1️⃣ Install Dependencies

```bash
# Install backend dependencies
npm install

# Install Oracle Instant Client (see DEPLOYMENT_GUIDE.md for details)
```

### 2️⃣ Configure Database

```bash
# Copy environment template
cp .env.template .env

# Edit with your Oracle credentials
nano .env
```

Add your Oracle Autonomous Database credentials:
```env
DB_USER=ADMIN
DB_PASSWORD=YourPassword123!
DB_CONNECT_STRING=(description=...)
```

### 3️⃣ Test Connection

```bash
# Test Oracle database connection
node test-connection.js
```

Expected output:
```
✅ Connection successful!
✅ CLAIMS table found: XX records
✅ ADJUSTERS table found: XX records
✅ DAMAGES table found: XX records
🎉 All tests passed!
```

### 4️⃣ Start Backend Server

```bash
# Start the API server
npm start
```

Server runs at: `http://localhost:3001`

### 5️⃣ Start Frontend

```bash
# In a new terminal, create React app
npx create-react-app frontend
cd frontend

# Copy the React component
cp ../StateFarmLivePortal.jsx src/

# Install dependencies
npm install recharts

# Update src/App.js to import StateFarmLivePortal
# Then start the app
npm start
```

Frontend runs at: `http://localhost:3000`

---

## 📁 Project Structure

```
state-farm-portal/
├── backend/
│   ├── server.js              # Express API server
│   ├── package.json           # Backend dependencies
│   ├── .env                   # Database credentials (not committed)
│   ├── .env.template          # Environment template
│   └── test-connection.js     # Connection test script
│
├── frontend/
│   ├── src/
│   │   ├── StateFarmLivePortal.jsx  # Main React component
│   │   └── App.js             # React app entry
│   ├── package.json           # Frontend dependencies
│   └── public/
│
├── DEPLOYMENT_GUIDE.md        # Detailed deployment instructions
└── README.md                  # This file
```

---

## 🎯 Features

### Dashboard
- 📊 Real-time KPIs (Total Claims, Urgent, High Priority, Unassigned)
- 📈 Interactive charts (Claims by Type, Claims by Status)
- 💰 Total estimated loss tracking
- 🤖 Average AI confidence scoring

### Claims Management
- 📋 Live claims feed with auto-refresh (30s)
- 🔍 Detailed claim views
- 👔 Adjuster assignment tracking
- ⚠️ Priority-based filtering

### AI Insights
- 🤖 AI confidence scoring for each claim
- 📊 Low-confidence claim identification
- 🎯 Review recommendations
- 📈 Confidence distribution analytics

### Damage Assessments
- 💰 Repair cost estimates
- 🏗️ Severity classifications
- 📅 Assessment tracking
- 🔗 Claim linking

---

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Server health check |
| `GET /api/claims` | All claims with full details |
| `GET /api/claims/:id` | Single claim by ID |
| `GET /api/adjusters` | All adjusters |
| `GET /api/damages` | All damage assessments |
| `GET /api/stats` | Dashboard statistics |

---

## 🎨 Tech Stack

**Frontend:**
- React 18
- Recharts for data visualization
- Inline CSS with gradient designs

**Backend:**
- Node.js + Express
- Oracle Database driver (oracledb)
- CORS enabled
- Connection pooling

**Database:**
- Oracle Autonomous Database (VIBECODING_MEDIUM)
- Port: 6100 (displayed in UI)
- Tables: CLAIMS, ADJUSTERS, DAMAGES

---

## 🛠️ Development

### Add New Features

```bash
# Backend: Add new API endpoint
# Edit server.js and add:
app.get('/api/new-endpoint', async (req, res) => {
  // Your code here
});

# Frontend: Add new component
# Edit StateFarmLivePortal.jsx
```

### Database Schema

Required tables:
- **CLAIMS**: Main claims table
- **ADJUSTERS**: Insurance adjusters
- **DAMAGES**: Damage assessments

See `DEPLOYMENT_GUIDE.md` for full schema details.

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Oracle Instant Client
node -e "require('oracledb')"

# Test database connection
node test-connection.js
```

### Frontend connection error
```bash
# Verify backend is running
curl http://localhost:3001/health

# Check CORS configuration in server.js
```

### Database errors
- Verify credentials in `.env`
- Check Oracle Cloud firewall rules
- Confirm service is running
- Test with Oracle SQL Developer

---

## 📚 Documentation

- [Full Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Oracle Node.js Driver Docs](https://node-oracledb.readthedocs.io/)
- [React Documentation](https://react.dev/)
- [Oracle Autonomous Database](https://www.oracle.com/autonomous-database/)

---

## 🔐 Security

- ⚠️ Never commit `.env` file
- 🔒 Use Oracle Wallet in production
- 🛡️ Enable authentication before deployment
- 🔑 Rotate credentials regularly
- 🌐 Use HTTPS in production

---

## 📊 Sample Data

To populate with sample data, run:

```sql
-- See DEPLOYMENT_GUIDE.md for sample data scripts
```

---

## 🎯 Roadmap

- [x] Backend API with Oracle integration
- [x] Frontend dashboard with live data
- [x] Real-time data refresh
- [x] AI insights visualization
- [ ] User authentication
- [ ] WebSocket real-time updates
- [ ] Export to PDF/Excel
- [ ] Mobile responsive design
- [ ] Production deployment

---

## 📄 License

MIT License - see LICENSE file

---

## 👥 Support

For issues:
1. Check `DEPLOYMENT_GUIDE.md`
2. Review server logs
3. Test database connection
4. Verify environment variables

---

**Built with ❤️ for State Farm Insurance**
