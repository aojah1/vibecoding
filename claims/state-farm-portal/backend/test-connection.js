import oracledb from "oracledb";
import dotenv from "dotenv";
dotenv.config();

const DB_USER = process.env.DB_USER || "ADMIN";
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_CONNECT_STRING = process.env.DB_CONNECT_STRING || "vibecoding_medium";
const TNS_ADMIN = process.env.TNS_ADMIN;
const WALLET_PASSWORD = process.env.WALLET_PASSWORD;

// Configure Oracle client
if (TNS_ADMIN) {
  process.env.TNS_ADMIN = TNS_ADMIN;
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

// Helper function to check if table exists
async function tableExists(connection, tableName) {
  try {
    const result = await connection.execute(
      `SELECT COUNT(*) as COUNT 
       FROM USER_TABLES 
       WHERE TABLE_NAME = :tableName`,
      [tableName.toUpperCase()],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0].COUNT > 0;
  } catch (err) {
    return false;
  }
}

// Helper function to check if column exists
async function columnExists(connection, tableName, columnName) {
  try {
    const result = await connection.execute(
      `SELECT COUNT(*) as COUNT 
       FROM USER_TAB_COLUMNS 
       WHERE TABLE_NAME = :tableName 
       AND COLUMN_NAME = :columnName`,
      [tableName.toUpperCase(), columnName.toUpperCase()],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows[0].COUNT > 0;
  } catch (err) {
    return false;
  }
}

async function testConnection() {
  let connection;
  
  console.log('🔍 Testing Oracle Database Connection...\n');
  console.log('Configuration:');
  console.log(`  User: ${DB_USER}`);
  console.log(`  Password: ${DB_PASSWORD ? '***' + DB_PASSWORD.slice(-4) : 'NOT SET'}`);
  console.log(`  Connection String: ${DB_CONNECT_STRING}`);
  console.log(`  TNS_ADMIN: ${TNS_ADMIN || 'NOT SET'}`);
  console.log(`  Wallet Password: ${WALLET_PASSWORD ? '***' : 'NOT SET'}\n`);

  try {
    console.log('⏳ Attempting to connect...');
    
    // Connection configuration
    const config = {
      user: DB_USER,
      password: DB_PASSWORD,
      connectString: DB_CONNECT_STRING
    };

    // Add wallet configuration if TNS_ADMIN is set
    if (TNS_ADMIN) {
      config.configDir = TNS_ADMIN;
      config.walletLocation = TNS_ADMIN;
      if (WALLET_PASSWORD) {
        config.walletPassword = WALLET_PASSWORD;
      }
      config.sslServerDNMatch = true;
    }

    connection = await oracledb.getConnection(config);
    console.log('✅ Connection successful!\n');

    // List all tables in the database
    console.log('📋 Checking available tables...');
    const tablesResult = await connection.execute(
      `SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ Found tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.TABLE_NAME}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No tables found in database\n');
    }

    // Track missing tables and columns
    const missingTables = [];
    const missingColumns = [];

    // Test CLAIMS table
    console.log('📊 Testing CLAIMS table...');
    if (await tableExists(connection, 'CLAIMS')) {
      const claimsResult = await connection.execute(
        `SELECT COUNT(*) as TOTAL FROM CLAIMS`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log(`✅ CLAIMS table found: ${claimsResult.rows[0].TOTAL} records`);
      
      // Check for CREATED_DATE column
      if (!(await columnExists(connection, 'CLAIMS', 'CREATED_DATE'))) {
        console.log('⚠️  CLAIMS table is missing CREATED_DATE column');
        missingColumns.push('CLAIMS.CREATED_DATE');
      } else {
        console.log('✅ CLAIMS.CREATED_DATE column exists');
      }
      console.log('');
    } else {
      console.log('❌ CLAIMS table does NOT exist\n');
      missingTables.push('CLAIMS');
    }

    // Test ADJUSTERS table
    console.log('👔 Testing ADJUSTERS table...');
    if (await tableExists(connection, 'ADJUSTERS')) {
      const adjustersResult = await connection.execute(
        `SELECT COUNT(*) as TOTAL FROM ADJUSTERS`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log(`✅ ADJUSTERS table found: ${adjustersResult.rows[0].TOTAL} records\n`);
    } else {
      console.log('❌ ADJUSTERS table does NOT exist\n');
      missingTables.push('ADJUSTERS');
    }

    // Test DAMAGES table
    console.log('💰 Testing DAMAGES table...');
    if (await tableExists(connection, 'DAMAGES')) {
      const damagesResult = await connection.execute(
        `SELECT COUNT(*) as TOTAL FROM DAMAGES`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log(`✅ DAMAGES table found: ${damagesResult.rows[0].TOTAL} records\n`);
    } else {
      console.log('❌ DAMAGES table does NOT exist\n');
      missingTables.push('DAMAGES');
    }

    // Sample data from CLAIMS if it exists (without CREATED_DATE dependency)
    if (!missingTables.includes('CLAIMS')) {
      console.log('📋 Sample Claims Data (top 5):');
      try {
        // Try with CREATED_DATE first
        let sampleQuery = `SELECT CLAIM_NUMBER, CLAIM_TYPE, STATUS, PRIORITY 
                          FROM CLAIMS 
                          WHERE ROWNUM <= 5`;
        
        // Add ORDER BY only if CREATED_DATE exists
        if (await columnExists(connection, 'CLAIMS', 'CREATED_DATE')) {
          sampleQuery += ` ORDER BY CREATED_DATE DESC`;
        }
        
        const sampleClaims = await connection.execute(
          sampleQuery,
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (sampleClaims.rows.length > 0) {
          console.table(sampleClaims.rows);
        } else {
          console.log('⚠️  No claims found in database\n');
        }
      } catch (err) {
        console.log(`⚠️  Could not retrieve sample claims: ${err.message}\n`);
      }
    }

    // Test connection pool creation
    console.log('\n🔄 Testing connection pool creation...');
    const pool = await oracledb.createPool({
      user: DB_USER,
      password: DB_PASSWORD,
      connectString: DB_CONNECT_STRING,
      configDir: TNS_ADMIN,
      walletLocation: TNS_ADMIN,
      walletPassword: WALLET_PASSWORD,
      sslServerDNMatch: true,
      poolMin: 1,
      poolMax: 8,
      poolIncrement: 1,
      queueTimeout: 15000,
      poolTimeout: 60,
      stmtCacheSize: 30,
      homogeneous: true
    });
    
    console.log('✅ Connection pool created successfully!');
    console.log(`   Pool size: min=${pool.poolMin}, max=${pool.poolMax}, increment=${pool.poolIncrement}`);
    
    // Close the pool
    await pool.close(0);
    console.log('✅ Connection pool closed\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (missingTables.length > 0 || missingColumns.length > 0) {
      console.log('⚠️  WARNING: Some tables or columns are missing!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (missingTables.length > 0) {
        console.log('\nMissing tables:');
        missingTables.forEach(table => {
          console.log(`  ❌ ${table}`);
        });
      }
      
      if (missingColumns.length > 0) {
        console.log('\nMissing columns:');
        missingColumns.forEach(column => {
          console.log(`  ❌ ${column}`);
        });
      }
      
      console.log('\n💡 To fix missing tables/columns:');
      console.log('   Run: FIX_TABLES.sql in Oracle SQL Developer or SQLcl');
      console.log('   This will add missing columns and create missing tables\n');
      console.log('   Location: FIX_TABLES.sql in your project folder\n');
    } else {
      console.log('🎉 All tests passed! Your database is ready.');
      console.log('You can now start the backend server with: npm start\n');
    }

  } catch (err) {
    console.error('\n❌ Connection test failed!');
    console.error('Error:', err.message);
    
    if (err.message.includes('ORA-01017')) {
      console.error('\n💡 Invalid username/password - check your .env file');
    } else if (err.message.includes('ORA-12154')) {
      console.error('\n💡 TNS: could not resolve connect identifier');
      console.error('   - Check your DB_CONNECT_STRING in .env');
      console.error('   - Verify TNS_ADMIN points to wallet directory');
    } else if (err.message.includes('NJS-516')) {
      console.error('\n💡 Wallet/config directory issue');
      console.error('   - Check TNS_ADMIN path in .env');
      console.error('   - Verify wallet files exist in directory');
    } else if (err.message.includes('ORA-12543')) {
      console.error('\n💡 Network/host name resolution issue');
      console.error('   - Check your network connection');
      console.error('   - Verify tnsnames.ora has correct host');
    } else if (err.message.includes('ORA-00904')) {
      console.error('\n💡 Missing column in database table');
      console.error('   - Run FIX_TABLES.sql to add missing columns');
      console.error('   - This will fix the table structure');
    }
    
    console.error('\n💡 Common solutions:');
    console.error('  1. Run FIX_TABLES.sql to fix table structure');
    console.error('  2. Check your .env file has correct credentials');
    console.error('  3. Verify Oracle Instant Client is installed');
    console.error('  4. Confirm TNS_ADMIN points to wallet directory');
    console.error('  5. Verify network connectivity to Oracle Cloud\n');
    console.error('Full error details:');
    console.error(err);
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Connection closed\n');
      } catch (err) {
        console.error('Error closing connection:', err.message);
      }
    }
  }
}

testConnection();