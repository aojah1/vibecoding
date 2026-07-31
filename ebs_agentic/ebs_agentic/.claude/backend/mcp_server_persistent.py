#!/usr/bin/env python3
"""
FastMCP Server for EBS AP Analytics - PERSISTENT VERSION
Stays alive and handles multiple requests without exiting
"""

from fastmcp import FastMCP
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import asyncio
import json
import os
import sys
from datetime import datetime

# Configuration
SQLCL_PATH = os.getenv('SQLCL_PATH', '/Applications/sqlcl/bin/sql')
SQLCL_CONNECTION = os.getenv('SQLCL_CONNECTION', 'ebs_aby_db_marsh')
ANALYSIS_DATE = '10-OCT-2010'

# Logging to stderr (stdout is reserved for MCP protocol)
def log(msg):
    print(msg, file=sys.stderr, flush=True)

# Create FastMCP server
mcp = FastMCP("EBS AP Analytics Server")

# Global SQLcl MCP client session
sqlcl_session = None
sqlcl_streams = None

async def get_sqlcl_session():
    """Get or create SQLcl MCP client session"""
    global sqlcl_session, sqlcl_streams
    
    if sqlcl_session is None:
        log(f"📡 Connecting to SQLcl MCP at {SQLCL_PATH}")
        
        # Verify SQLcl exists
        if not os.path.exists(SQLCL_PATH):
            raise FileNotFoundError(f"SQLcl not found at: {SQLCL_PATH}")
        
        # Create connection to SQLcl MCP server
        server_params = StdioServerParameters(
            command=SQLCL_PATH,
            args=["-mcp"],
            env=None
        )
        
        # Connect using async context manager - keep it open
        sqlcl_streams = stdio_client(server_params)
        read_stream, write_stream = await sqlcl_streams.__aenter__()
        
        # Create and initialize session
        sqlcl_session = ClientSession(read_stream, write_stream)
        await sqlcl_session.__aenter__()
        await sqlcl_session.initialize()
        
        log(f"✅ Connected to SQLcl MCP")
    
    return sqlcl_session

async def execute_sqlcl_query(sql: str) -> dict:
    """Execute SQL query via SQLcl MCP"""
    try:
        session = await get_sqlcl_session()
        
        # Connect to the database
        try:
            await session.call_tool(
                "connect",
                arguments={"connection_name": SQLCL_CONNECTION}
            )
            log(f"✅ Connected to database: {SQLCL_CONNECTION}")
        except Exception as e:
            # Might already be connected
            pass
        
        # Execute the SQL query
        log(f"📊 Executing SQL: {sql[:100]}...")
        result = await session.call_tool(
            "run-sql",
            arguments={"sql": sql}
        )
        
        log(f"✅ Query executed successfully")
        
        # Parse the result
        if hasattr(result, 'content') and result.content and len(result.content) > 0:
            for block in result.content:
                if hasattr(block, 'text'):
                    csv_data = block.text
                    log(f"📄 Received CSV data ({len(csv_data)} chars)")
                    parsed = parse_csv_result(csv_data)
                    log(f"✅ Parsed {parsed.get('rowCount', 0)} rows")
                    return parsed
        
        log(f"⚠️  No data in result")
        return {"success": True, "data": [], "rowCount": 0}
        
    except Exception as e:
        log(f"❌ Error executing query: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "query": sql
        }

def parse_csv_result(csv_text: str) -> dict:
    """Parse CSV result from SQLcl into structured data"""
    try:
        lines = csv_text.strip().split('\n')
        if len(lines) < 2:
            return {"success": True, "data": [], "rowCount": 0}
        
        # First line is headers
        headers = [h.strip().strip('"') for h in lines[0].split(',')]
        
        # Parse data rows
        data = []
        for line in lines[1:]:
            if not line.strip():
                continue
            
            values = parse_csv_line(line)
            
            if len(values) == len(headers):
                row = {}
                for i, header in enumerate(headers):
                    row[header] = values[i].strip().strip('"')
                data.append(row)
        
        return {
            "success": True,
            "data": data,
            "rowCount": len(data)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to parse CSV: {str(e)}",
            "raw": csv_text[:500]
        }

def parse_csv_line(line: str) -> list:
    """Parse a single CSV line handling quoted values"""
    values = []
    current = ""
    in_quotes = False
    
    for char in line:
        if char == '"':
            in_quotes = not in_quotes
        elif char == ',' and not in_quotes:
            values.append(current)
            current = ""
        else:
            current += char
    
    values.append(current)
    return values

@mcp.tool()
async def execute_sql(query: str) -> dict:
    """
    Execute SQL query against Oracle EBS database using SQLcl MCP.
    
    Args:
        query: SQL query to execute
        
    Returns:
        Dictionary with query results
    """
    log(f"🔧 Tool called: execute_sql")
    log(f"   Query: {query[:100]}...")
    
    result = await execute_sqlcl_query(query)
    result["timestamp"] = datetime.now().isoformat()
    result["query"] = query
    
    log(f"📤 Returning result with {result.get('rowCount', 0)} rows")
    
    return result

@mcp.tool()
async def get_top_suppliers(limit: int = 10) -> dict:
    """Get top suppliers with outstanding payments."""
    log(f"🔧 Tool called: get_top_suppliers (limit={limit})")
    
    sql = f"""
        SELECT 
            pv.vendor_name,
            pv.vendor_id,
            COUNT(ai.invoice_id) as invoice_count,
            SUM(ai.invoice_amount - NVL(ai.amount_paid, 0)) as outstanding_amount,
            ai.invoice_currency_code as currency
        FROM ap.ap_invoices_all ai
        JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
        WHERE ai.payment_status_flag != 'Y'
            AND ai.cancelled_date IS NULL
        GROUP BY pv.vendor_name, pv.vendor_id, ai.invoice_currency_code
        ORDER BY SUM(ai.invoice_amount - NVL(ai.amount_paid, 0)) DESC
        FETCH FIRST {limit} ROWS ONLY
    """
    return await execute_sql(sql)

@mcp.tool()
async def test_connection() -> dict:
    """Test the SQLcl MCP connection with a simple query."""
    log(f"🔧 Tool called: test_connection")
    sql = "SELECT 'Hello from Oracle!' as message, SYSDATE as current_time FROM dual"
    return await execute_sql(sql)

@mcp.resource("schema://ap_tables")
async def get_ap_schema() -> str:
    """Get information about AP schema tables."""
    return f"""
    Oracle EBS Accounts Payable Schema:
    
    SQLcl Path: {SQLCL_PATH}
    Connection: {SQLCL_CONNECTION}
    Analysis Date: {ANALYSIS_DATE}
    
    Main Tables:
    - ap.ap_invoices_all
    - ap.ap_suppliers
    - ap.ap_holds_all
    """

if __name__ == "__main__":
    log("=" * 60)
    log("🚀 Starting FastMCP Server (PERSISTENT MODE)")
    log("=" * 60)
    log(f"📊 SQLcl Path: {SQLCL_PATH}")
    log(f"🔌 Connection: {SQLCL_CONNECTION}")
    log(f"📅 Analysis Date: {ANALYSIS_DATE}")
    log("🔄 Server will stay alive and handle multiple requests")
    log("=" * 60)
    
    # Run the MCP server - this should block and keep running
    try:
        mcp.run()
    except KeyboardInterrupt:
        log("\n🛑 Server stopped by user")
    except Exception as e:
        log(f"\n❌ Server error: {e}")
        import traceback
        log(traceback.format_exc())
