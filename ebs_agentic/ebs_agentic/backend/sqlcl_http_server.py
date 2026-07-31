#!/usr/bin/env python3
"""
Simple HTTP Server for SQLcl - FIXED for Single-Column CSV
Handles both single-column and multi-column queries correctly
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import json
import os
import subprocess
import csv
import io

# Configuration
SQLCL_PATH = os.getenv('SQLCL_PATH', '/Users/aojah/Documents/GenAI-CoE/Agentic-Framework/source-code/agentic-ai-landing-zone-master/agentic-ai-landing-zone/client/ai_ops/sqlcl/bin/sql')
SQLCL_CONNECTION = os.getenv('SQLCL_CONNECTION', 'AGENT_ADB_HIGH')
SERVER_HOST = os.getenv('SERVER_HOST', 'localhost')
PORT = int(os.getenv('PYTHON_SERVER_PORT', '5001'))

def execute_sql_direct(sql: str) -> dict:
    """Execute SQL directly via SQLcl subprocess"""
    try:
        print(f"📊 Executing: {sql[:100]}...", flush=True)
        
        # Use SQLcl's -name parameter for saved connections
        print(f"🔧 Using saved connection: -name {SQLCL_CONNECTION}", flush=True)
        
        # Create SQL script — ensure SQL is terminated with a semicolon
        # so SQLcl doesn't treat 'exit' as part of the SQL statement
        sql_trimmed = sql.strip().rstrip(';')
        sqlcl_commands = f"""set sqlformat csv
{sql_trimmed};
exit
"""
        
        # Execute SQLcl with -name parameter
        process = subprocess.Popen(
            [SQLCL_PATH, '-name', SQLCL_CONNECTION, '-noupdates', '-S'],  # -S = silent mode
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(input=sqlcl_commands, timeout=30)
        
        print(f"📤 SQLcl stdout length: {len(stdout)}", flush=True)
        
        if stderr:
            print(f"⚠️ SQLcl stderr: {stderr[:200]}", flush=True)
        
        # Check for errors in output
        if 'ORA-' in stdout or 'SP2-' in stdout or 'Connection failed' in stdout:
            error_lines = [l for l in stdout.split('\n') if 'ORA-' in l or 'SP2-' in l or 'failed' in l.lower()]
            error_msg = '; '.join(error_lines[:3])
            print(f"❌ Oracle error: {error_msg}", flush=True)
            return {"success": False, "error": error_msg, "stdout": stdout[:500]}
        
        # Parse CSV output
        lines = stdout.split('\n')
        
        print(f"📋 Total output lines: {len(lines)}", flush=True)
        print(f"📋 First 5 lines: {lines[:5]}", flush=True)
        
        # Find CSV data - FIXED to handle single-column CSV (no commas!)
        csv_start = -1
        skip_patterns = ['SQL>', 'Connected', 'Copyright', 'Oracle Corporation', 'Password', 'Release', 'Version']
        
        for i, line in enumerate(lines):
            line_clean = line.strip()
            
            # Skip empty lines and known non-CSV patterns
            if not line_clean or any(skip in line for skip in skip_patterns):
                continue
            
            # Check if it looks like a CSV header
            # Single column: "COUNT" or COUNT
            # Multi column: "COL1","COL2" or COL1,COL2
            # Headers start with letter or quote
            if line_clean and (line_clean[0] == '"' or line_clean[0].isalpha()):
                csv_start = i
                print(f"✅ Found CSV header at line {i}: {line_clean[:80]}", flush=True)
                break
        
        if csv_start == -1:
            print(f"⚠️ No CSV data found in output", flush=True)
            print(f"Full stdout (first 1000 chars): {stdout[:1000]}", flush=True)
            return {"success": False, "error": "No CSV data in output - connection may have failed", "stdout": stdout[:500]}
        
        # Extract CSV starting from header
        csv_lines = []
        for line in lines[csv_start:]:
            line_clean = line.strip()
            # Stop at SQL> prompt, Disconnected message, or "N rows selected" summary
            if line_clean.startswith('SQL>') or 'Disconnected' in line or 'rows selected' in line_clean:
                break
            if line_clean:  # Keep non-empty lines
                csv_lines.append(line)
        
        csv_data = '\n'.join(csv_lines).strip()
        
        print(f"📄 CSV data length: {len(csv_data)}", flush=True)
        print(f"📄 CSV data:\n{csv_data}", flush=True)
        
        # Parse CSV
        reader = csv.DictReader(io.StringIO(csv_data))
        rows = list(reader)
        
        print(f"✅ Parsed {len(rows)} rows", flush=True)
        if rows:
            print(f"📊 First row: {rows[0]}", flush=True)
        
        return {
            "success": True,
            "data": rows,
            "rowCount": len(rows)
        }
        
    except subprocess.TimeoutExpired:
        print(f"❌ Query timeout", flush=True)
        return {"success": False, "error": "Query timeout after 30 seconds"}
    except Exception as e:
        print(f"❌ Exception: {type(e).__name__}: {e}", flush=True)
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}", flush=True)
        return {"success": False, "error": f"{type(e).__name__}: {str(e)}"}

class SQLHandler(BaseHTTPRequestHandler):
    """HTTP request handler"""
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/execute':
            try:
                # Read request
                content_length = int(self.headers['Content-Length'])
                body = self.rfile.read(content_length)
                data = json.loads(body)
                
                sql = data.get('sql', '')
                
                # Execute SQL
                result = execute_sql_direct(sql)
                
                # Send response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                print(f"❌ Handler error: {e}", flush=True)
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

if __name__ == "__main__":
    print("=" * 60, flush=True)
    print("🚀 SQLcl HTTP Server - FIXED (Single-Column CSV Support)", flush=True)
    print("=" * 60, flush=True)
    print(f"📡 Port: {PORT}", flush=True)
    print(f"📊 SQLcl: {SQLCL_PATH}", flush=True)
    print(f"🔌 Connection: {SQLCL_CONNECTION}", flush=True)
    print("🔧 Supports: Single & Multi-column CSV", flush=True)
    print("=" * 60, flush=True)
    print("", flush=True)
    
    # Test SQLcl connection
    print("Testing SQLcl connection...", flush=True)
    test_result = execute_sql_direct("SELECT 'OK' as status FROM dual")
    if test_result.get('success'):
        print("✅ SQLcl connection test passed", flush=True)
        print(f"   Result: {test_result.get('data')}", flush=True)
    else:
        print(f"⚠️ SQLcl connection test failed: {test_result.get('error')}", flush=True)
    
    # Test single-column query
    print("", flush=True)
    print("Testing single-column query...", flush=True)
    test_result2 = execute_sql_direct("SELECT COUNT(*) as count FROM dual")
    if test_result2.get('success'):
        print("✅ Single-column test passed", flush=True)
        print(f"   Result: {test_result2.get('data')}", flush=True)
    else:
        print(f"⚠️ Single-column test failed: {test_result2.get('error')}", flush=True)
    print("", flush=True)
    
    # Use a threaded server so concurrent dashboard queries don't queue up
    # and exceed the frontend timeout (each SQLcl subprocess takes ~7-10 s)
    class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
        daemon_threads = True

    server = ThreadedHTTPServer((SERVER_HOST, PORT), SQLHandler)
    
    try:
        print(f"✅ Server running on http://{SERVER_HOST}:{PORT}", flush=True)
        print(f"   Endpoint: POST http://{SERVER_HOST}:{PORT}/execute", flush=True)
        print("   Press Ctrl+C to stop", flush=True)
        print("", flush=True)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped", flush=True)
        server.shutdown()