#!/usr/bin/env python3
"""
StateFarm Fraud Detection - Directory Structure Verification
Run this script to check if all files are in the correct locations
"""

import os
import sys

def check_file(filepath, description):
    """Check if a file exists"""
    exists = os.path.exists(filepath)
    status = "✓" if exists else "✗"
    print(f"{status} {description}: {filepath}")
    return exists

def check_directory_structure():
    """Verify the complete directory structure"""
    print("=" * 60)
    print("StateFarm Fraud Detection - Structure Verification")
    print("=" * 60)
    print(f"\nCurrent Directory: {os.getcwd()}\n")
    
    all_ok = True
    
    print("Required Files:")
    print("-" * 60)
    all_ok &= check_file("app.py", "Flask API Backend")
    all_ok &= check_file("fraud_detection_service.py", "AI Detection Service")
    all_ok &= check_file("requirements.txt", "Dependencies")
    all_ok &= check_file(".env", "Environment Config")
    
    print("\nRequired Directory:")
    print("-" * 60)
    all_ok &= check_file("templates", "Templates Folder")
    
    if os.path.exists("templates"):
        print("\nTemplates Folder Contents:")
        print("-" * 60)
        all_ok &= check_file("templates/dashboard.html", "Dashboard Template")
    
    print("\nOptional Files:")
    print("-" * 60)
    check_file("test_fraud_detection.py", "Test Suite")
    check_file("README.md", "Documentation")
    check_file("venv", "Virtual Environment")
    
    print("\n" + "=" * 60)
    
    if all_ok:
        print("✅ SUCCESS! All required files are in place.")
        print("\nYou can now run:")
        print("  python app.py")
        print("\nThen open: http://localhost:3200")
    else:
        print("❌ MISSING FILES! Please ensure all required files are present.")
        print("\nRequired structure:")
        print("  frauddetection/")
        print("  ├── app.py")
        print("  ├── fraud_detection_service.py")
        print("  ├── templates/")
        print("  │   └── dashboard.html")
        print("  ├── .env")
        print("  └── requirements.txt")
        print("\nMissing files need to be downloaded from the outputs folder.")
    
    print("=" * 60)
    return all_ok

if __name__ == "__main__":
    success = check_directory_structure()
    sys.exit(0 if success else 1)