# 🔄 ES MODULES VERSION - SETUP GUIDE

## 🎯 What Changed

The backend has been updated to use **ES Modules** (import/export) instead of CommonJS (require), matching your sample code style. This is more modern and consistent with current JavaScript standards.

### Key Changes:
- ✅ Uses `import` instead of `require`
- ✅ Oracle Wallet support (TNS_ADMIN configuration)
- ✅ Wallet password support for encrypted wallets
- ✅ Connection pooling with same settings as your sample
- ✅ `"type": "module"` in package.json

---

## 🚀 QUICK START

### Step 1: Download Your Oracle Wallet

1. **Log into Oracle Cloud Console**
2. **Navigate to:** Autonomous Database → VIBECODING_MEDIUM
3. **Click:** "DB Connection" button
4. **Click:** "Download Wallet" 
5. **Extract** the wallet zip file to a directory (e.g., `/Users/yourname/wallet`)

The wallet contains these files:
- `cwallet.sso` - Auto-login wallet (recommended)
- `ewallet.p12` - Encrypted wallet (requires password)
- `tnsnames.ora` - Connection definitions
- `sqlnet.ora` - Network configuration
- `ojdbc.properties` - JDBC settings

### Step 2: Configure Your Environment

Create `.env` file from the template:

```bash
cp env-template.txt .env
```

Edit `.env` with your actual values:

```env
# Your database credentials
DB_USER=ADMIN
DB_PASSWORD=YourActualPassword123!

# Service name from tnsnames.ora
DB_CONNECT_STRING=vibecoding_medium

# Path to your wallet directory
TNS_ADMIN=/Users/yourname/wallet

# Wallet password (leave empty if using auto-login wallet)
WALLET_PASSWORD=

# Server port
PORT=3001
```

### Step 3: Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web server
- `oracledb` - Oracle database driver
- `cors` - CORS middleware
- `dotenv` - Environment variables

### Step 4: Test Your Connection

```bash
npm run test
```

Or:

```bash
node test-connection.js
```

**Expected Output:**
```
🔍 Testing Oracle Database Connection...

Configuration:
  User: ADMIN
  Password: ***3456
  Connection String: vibecoding_medium
  TNS_ADMIN: /Users/yourname/wallet
  Wallet Password: ***

⏳ Attempting to connect...
✅ Connection successful!

📊 Testing CLAIMS table...
✅ CLAIMS table found: 10 records

👔 Testing ADJUSTERS table...
✅ ADJUSTERS table found: 5 records

💰 Testing DAMAGES table...
✅ DAMAGES table found: 11 records

🔄 Testing connection pool creation...
✅ Connection pool created successfully!
   Pool size: min=1, max=8, increment=1
✅ Connection pool closed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 All tests passed! Your database is ready.
You can now start the backend server with: npm start
```

### Step 5: Start the Server

```bash
npm start
```

**Expected Output:**
```
[db] Creating connection pool...
[db] Config: { connectString: 'vibecoding_medium', TNS_ADMIN: '/Users/yourname/wallet', user: 'ADMIN' }
✅ Oracle connection pool created successfully
   Pool: min=2, max=10, increment=1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 State Farm Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Server running:     http://localhost:3001
📡 API endpoints:      http://localhost:3001/api/*
❤️  Health check:      http://localhost:3001/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔍 Understanding the Wallet Setup

### What is TNS_ADMIN?

`TNS_ADMIN` is an environment variable that tells the Oracle client where to find:
- **Wallet files** (for encrypted connections)
- **tnsnames.ora** (connection definitions)
- **sqlnet.ora** (network configuration)

### Connection Methods

#### Method 1: Using Wallet (Recommended) ✅

```env
DB_CONNECT_STRING=vibecoding_medium
TNS_ADMIN=/path/to/wallet
```

**How it works:**
1. Oracle client reads `TNS_ADMIN` directory
2. Opens `tnsnames.ora` to find `vibecoding_medium` definition
3. Uses wallet (`cwallet.sso` or `ewallet.p12`) for SSL/TLS
4. Connects securely to Oracle Cloud

**Advantages:**
- ✅ More secure (credentials in wallet)
- ✅ Easier connection string
- ✅ SSL/TLS automatically configured
- ✅ Can switch between service levels easily

#### Method 2: Direct Connection String

```env
DB_CONNECT_STRING=(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=xxx.oraclecloud.com))(connect_data=(service_name=xxx_medium.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))
TNS_ADMIN=
```

**Advantages:**
- ✅ No wallet needed
- ✅ Self-contained configuration

**Disadvantages:**
- ❌ Long connection string
- ❌ May need SSL certificates configured separately

### Auto-login vs Encrypted Wallet

**Auto-login Wallet (`cwallet.sso`):**
```env
WALLET_PASSWORD=
```
- No password needed
- Automatically used when present
- Recommended for development

**Encrypted Wallet (`ewallet.p12`):**
```env
WALLET_PASSWORD=YourWalletPassword
```
- Requires password
- More secure
- Use in production

---

## 🐛 Troubleshooting

### Error: "ORA-12154: TNS:could not resolve connect identifier"

**Cause:** Can't find service name in tnsnames.ora

**Fix:**
1. Check `DB_CONNECT_STRING` matches name in `tnsnames.ora`
2. Verify `TNS_ADMIN` path is correct
3. Open `tnsnames.ora` and copy exact service name

**Example tnsnames.ora:**
```
vibecoding_medium = (description= ...)
vibecoding_high = (description= ...)
```

Use: `DB_CONNECT_STRING=vibecoding_medium`

---

### Error: "NJS-516: DPI-1047: Cannot locate a 64-bit Oracle Client library"

**Cause:** Oracle Instant Client not installed

**Fix:**

**macOS:**
```bash
brew tap InstantClientTap/instantclient
brew install instantclient-basic
```

**Linux (Ubuntu):**
```bash
# Download from Oracle website
wget https://download.oracle.com/otn_software/linux/instantclient/...
sudo apt install alien libaio1
alien -i oracle-instantclient-basic-*.rpm
```

**Windows:**
1. Download from Oracle website
2. Extract to `C:\oracle\instantclient_XX_X`
3. Add to PATH

---

### Error: "ORA-01017: invalid username/password"

**Cause:** Wrong credentials

**Fix:**
1. Check `DB_USER` and `DB_PASSWORD` in `.env`
2. Verify password in Oracle Cloud Console
3. Try resetting ADMIN password in Oracle Cloud

---

### Error: Wallet-related errors

**Cause:** Wallet path or password issue

**Fix:**
1. Verify `TNS_ADMIN` path exists: `ls $TNS_ADMIN`
2. Check wallet files present:
   ```bash
   ls /path/to/wallet
   # Should see: cwallet.sso, tnsnames.ora, sqlnet.ora
   ```
3. If using encrypted wallet, set `WALLET_PASSWORD`
4. Use auto-login wallet (`cwallet.sso`) for easier setup

---

## 📊 Code Structure

### Server Architecture

```javascript
import express from "express";
import oracledb from "oracledb";

// 1. Configure Oracle client
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// 2. Create connection pool
const pool = await oracledb.createPool({
  user: DB_USER,
  password: DB_PASSWORD,
  connectString: DB_CONNECT_STRING,
  configDir: TNS_ADMIN,           // Wallet directory
  walletLocation: TNS_ADMIN,       // Wallet directory
  walletPassword: WALLET_PASSWORD, // Optional
  sslServerDNMatch: true,
  poolMin: 2,
  poolMax: 10
});

// 3. Run queries
async function runQuery(sql, binds) {
  const conn = await pool.getConnection();
  const result = await conn.execute(sql, binds);
  await conn.close();
  return result;
}
```

### Connection Pool Benefits

- ✅ **Reuses connections** - Faster than creating new ones
- ✅ **Limits connections** - Prevents overloading database
- ✅ **Auto-manages** - Opens/closes as needed
- ✅ **Production-ready** - Handles high traffic

---

## 🎯 Next Steps

1. ✅ Test connection: `npm run test`
2. ✅ Start server: `npm start`
3. ✅ Test API: `curl http://localhost:3001/health`
4. ✅ Start frontend: See main documentation
5. ⬜ Populate data: Run `sample-data.sql`
6. ⬜ Customize: Modify code as needed

---

## 📚 Additional Resources

- **Oracle Node.js Driver:** https://node-oracledb.readthedocs.io/
- **Oracle Wallets:** https://docs.oracle.com/en/cloud/paas/autonomous-database/adbsa/connect-preparing.html
- **ES Modules:** https://nodejs.org/api/esm.html
- **Express.js:** https://expressjs.com/

---

## ✅ Configuration Checklist

Use this to verify your setup:

- [ ] Oracle Instant Client installed
- [ ] Wallet downloaded and extracted
- [ ] `.env` file created from template
- [ ] `DB_USER` set in `.env`
- [ ] `DB_PASSWORD` set in `.env`
- [ ] `DB_CONNECT_STRING` matches tnsnames.ora
- [ ] `TNS_ADMIN` points to wallet directory
- [ ] `npm install` completed successfully
- [ ] `npm run test` passes all tests
- [ ] `npm start` starts server without errors
- [ ] `curl http://localhost:3001/health` returns healthy

---

**All set! Your ES modules backend is ready to go! 🚀**
