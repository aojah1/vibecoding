#!/usr/bin/env python3
"""
Verify Database Integration Files
Checks if you have the latest versions of all required files
"""

import os
import sys

print("=" * 60)
print("Database Integration File Verification")
print("=" * 60)
print()

errors = []
warnings = []

# Check database_connector.py
print("1. Checking database_connector.py...")
try:
    from database_connector import DatabaseConnector
    db = DatabaseConnector()
    
    # Check for new attributes
    required_attrs = ['connection_string', 'tns_admin', 'wallet_password', 'connection', 'is_connected']
    missing_attrs = [attr for attr in required_attrs if not hasattr(db, attr)]
    
    if missing_attrs:
        print(f"   ✗ OLD VERSION detected - missing attributes: {', '.join(missing_attrs)}")
        errors.append("database_connector.py is outdated")
        print("   Action: Download new version from outputs folder")
    else:
        print("   ✓ database_connector.py is up to date")
        
        # Check if it has the new connect method
        import inspect
        connect_source = inspect.getsource(db.connect)
        if 'oracledb.connect' in connect_source:
            print("   ✓ Uses new oracledb connection method")
        else:
            print("   ⚠ May be using old connection method")
            warnings.append("database_connector.py might need update")
            
except ImportError:
    print("   ✗ database_connector.py NOT FOUND")
    errors.append("database_connector.py is missing")
except Exception as e:
    print(f"   ✗ Error loading database_connector.py: {e}")
    errors.append(f"database_connector.py error: {e}")

print()

# Check if oracledb is installed
print("2. Checking oracledb package...")
try:
    import oracledb
    print(f"   ✓ oracledb {oracledb.__version__} installed")
except ImportError:
    print("   ✗ oracledb NOT installed")
    errors.append("oracledb package missing")
    print("   Action: pip install oracledb==2.0.1")

print()

# Check if python-dateutil is installed
print("3. Checking python-dateutil package...")
try:
    import dateutil
    print(f"   ✓ python-dateutil installed")
except ImportError:
    print("   ⚠ python-dateutil NOT installed")
    warnings.append("python-dateutil missing (recommended)")
    print("   Action: pip install python-dateutil==2.8.2")

print()

# Check .env file
print("4. Checking .env configuration...")
from dotenv import load_dotenv
load_dotenv()

required_vars = {
    'TNS_ADMIN': 'Wallet directory path',
    'DB_CONNECTION_STRING': 'Database connection name',
    'WALLET_PASSWORD': 'Wallet password'
}

for var, description in required_vars.items():
    value = os.getenv(var)
    if value:
        if var == 'WALLET_PASSWORD':
            print(f"   ✓ {var}: {'*' * len(value)}")
        else:
            print(f"   ✓ {var}: {value}")
    else:
        print(f"   ✗ {var} NOT SET ({description})")
        errors.append(f"{var} not configured in .env")

print()

# Check wallet files
print("5. Checking wallet files...")
tns_admin = os.getenv('TNS_ADMIN')
if tns_admin:
    if os.path.exists(tns_admin):
        print(f"   ✓ Wallet directory exists: {tns_admin}")
        
        wallet_files = ['cwallet.sso', 'tnsnames.ora', 'sqlnet.ora']
        for filename in wallet_files:
            filepath = os.path.join(tns_admin, filename)
            if os.path.exists(filepath):
                print(f"   ✓ {filename}")
            else:
                print(f"   ✗ {filename} MISSING")
                errors.append(f"Wallet file {filename} missing")
    else:
        print(f"   ✗ Wallet directory does NOT exist: {tns_admin}")
        errors.append("TNS_ADMIN directory not found")
else:
    print("   ⚠ TNS_ADMIN not set, skipping wallet check")

print()

# Check app.py imports
print("6. Checking app.py imports...")
try:
    with open('app.py', 'r') as f:
        app_content = f.read()
        
    if 'from database_connector import DatabaseConnector' in app_content:
        print("   ✓ app.py imports DatabaseConnector")
    else:
        print("   ✗ app.py does NOT import DatabaseConnector")
        errors.append("app.py missing DatabaseConnector import")
        
    if 'from typing import List, Dict' in app_content:
        print("   ✓ app.py has typing imports")
    else:
        print("   ⚠ app.py may be missing typing imports")
        warnings.append("app.py might need typing imports")
        
except FileNotFoundError:
    print("   ✗ app.py NOT FOUND")
    errors.append("app.py is missing")
except Exception as e:
    print(f"   ⚠ Could not check app.py: {e}")

print()
print("=" * 60)

# Summary
if errors:
    print("❌ ERRORS FOUND - Action Required")
    print("=" * 60)
    for i, error in enumerate(errors, 1):
        print(f"{i}. {error}")
    print()
    print("TO FIX:")
    print("1. Download latest files from outputs folder:")
    print("   - database_connector.py")
    print("   - app.py")
    print("2. Install missing packages:")
    print("   pip install oracledb==2.0.1 python-dateutil==2.8.2")
    print("3. Update .env with database credentials")
    print()
    sys.exit(1)
    
elif warnings:
    print("⚠️  WARNINGS - Recommended Actions")
    print("=" * 60)
    for i, warning in enumerate(warnings, 1):
        print(f"{i}. {warning}")
    print()
    print("System should work, but recommended to address warnings.")
    print()
    
else:
    print("✅ ALL CHECKS PASSED")
    print("=" * 60)
    print()
    print("Your database integration is properly configured!")
    print()
    print("Next steps:")
    print("1. Test connection: python test_db_connection.py")
    print("2. Start app: python app.py")
    print("3. Open dashboard: http://localhost:3200")
    print("4. Click 'Load from Database' button")
    print()

sys.exit(0 if not errors else 1)