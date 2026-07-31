#!/usr/bin/env python3
"""
Standalone test for SQLcl MCP connection
FIXED: Uses correct tool names (without SQLcl: prefix)
"""

import asyncio
import os
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Configuration
SQLCL_PATH = os.getenv('SQLCL_PATH', '/Applications/sqlcl/bin/sql')
SQLCL_CONNECTION = os.getenv('SQLCL_CONNECTION', 'AGENT_ADB_HIGH')

async def test_sqlcl_mcp():
    """Test SQLcl MCP connection and query execution"""
    
    print("="*60)
    print("🧪 SQLcl MCP Standalone Test - CORRECTED")
    print("="*60)
    print(f"SQLcl Path: {SQLCL_PATH}")
    print(f"Connection: {SQLCL_CONNECTION}")
    print("")
    
    # Step 1: Verify SQLcl exists
    print("Step 1: Checking SQLcl installation...")
    if not os.path.exists(SQLCL_PATH):
        print(f"❌ SQLcl not found at: {SQLCL_PATH}")
        return False
    print(f"✅ SQLcl found")
    print("")
    
    # Step 2: Create MCP connection
    print("Step 2: Creating MCP connection to SQLcl...")
    try:
        server_params = StdioServerParameters(
            command=SQLCL_PATH,
            args=["-mcp"],  # FIXED: Use -mcp not --mcp
            env=None
        )
        print(f"   Command: {server_params.command}")
        print(f"   Args: {server_params.args}")
        
        # Connect using async context manager
        print("   Connecting...")
        async with stdio_client(server_params) as (read_stream, write_stream):
            print(f"✅ Transport created")
            
            # Create session
            print("   Creating session...")
            async with ClientSession(read_stream, write_stream) as session:
                print(f"✅ Session created")
                
                # Initialize
                print("   Initializing...")
                await session.initialize()
                print(f"✅ Session initialized")
                print("")
                
                # Step 3: List available tools
                print("Step 3: Listing available SQLcl MCP tools...")
                tools_result = await session.list_tools()
                print(f"✅ Found {len(tools_result.tools)} tools:")
                for tool in tools_result.tools:
                    print(f"   - {tool.name}: {tool.description[:60]}...")
                print("")
                
                # Step 4: List available connections
                print("Step 4: Listing available connections...")
                try:
                    result = await session.call_tool(
                        "list-connections",  # FIXED: No SQLcl: prefix
                        arguments={"filter": ""}
                    )
                    print(f"✅ Connections listed:")
                    if hasattr(result, 'content'):
                        for block in result.content:
                            if hasattr(block, 'text'):
                                print(f"   {block.text}")
                    print("")
                except Exception as e:
                    print(f"⚠️  Could not list connections: {e}")
                    print("")
                
                # Step 5: Connect to database
                print(f"Step 5: Connecting to database: {SQLCL_CONNECTION}...")
                try:
                    result = await session.call_tool(
                        "connect",  # FIXED: No SQLcl: prefix
                        arguments={"connection_name": SQLCL_CONNECTION}
                    )
                    print(f"✅ Connected to database")
                    if hasattr(result, 'content'):
                        for block in result.content:
                            if hasattr(block, 'text'):
                                print(f"   Response: {block.text[:200]}")
                    print("")
                except Exception as e:
                    print(f"❌ Failed to connect to database: {e}")
                    import traceback
                    traceback.print_exc()
                    return False
                
                # Step 6: Execute simple test query
                print("Step 6: Executing test query: SELECT 'TEST' FROM dual...")
                try:
                    result = await session.call_tool(
                        "run-sql",  # FIXED: No SQLcl: prefix
                        arguments={"sql": "SELECT 'TEST_VALUE' as test_column FROM dual"}
                    )
                    print(f"✅ Query executed")
                    
                    if hasattr(result, 'content'):
                        print(f"   Content blocks: {len(result.content)}")
                        for i, block in enumerate(result.content):
                            print(f"   Block {i} type: {type(block).__name__}")
                            if hasattr(block, 'text'):
                                print(f"   Block {i} text:")
                                print(f"   {block.text}")
                            else:
                                print(f"   Block {i}: {block}")
                    else:
                        print(f"   Result: {result}")
                    print("")
                except Exception as e:
                    print(f"❌ Failed to execute query: {e}")
                    import traceback
                    traceback.print_exc()
                    return False
                
                # Step 7: Execute real query
                print("Step 7: Executing real query: SELECT COUNT(*) FROM ap.ap_suppliers...")
                try:
                    result = await session.call_tool(
                        "run-sql",  # FIXED: No SQLcl: prefix
                        arguments={"sql": "SELECT COUNT(*) as supplier_count FROM ap.ap_suppliers"}
                    )
                    print(f"✅ Query executed")
                    
                    if hasattr(result, 'content'):
                        for block in result.content:
                            if hasattr(block, 'text'):
                                print(f"   Result:")
                                print(f"   {block.text}")
                    print("")
                except Exception as e:
                    print(f"❌ Failed to execute query: {e}")
                    import traceback
                    traceback.print_exc()
                    return False
                
                # Step 8: Execute complex query
                print("Step 8: Executing complex query: Top 3 suppliers...")
                sql = """SELECT vendor_name, COUNT(*) as invoice_count 
                         FROM ap.ap_invoices_all ai 
                         JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id 
                         GROUP BY vendor_name 
                         ORDER BY COUNT(*) DESC 
                         FETCH FIRST 3 ROWS ONLY"""
                try:
                    result = await session.call_tool(
                        "run-sql",
                        arguments={"sql": sql}
                    )
                    print(f"✅ Query executed")
                    
                    if hasattr(result, 'content'):
                        for block in result.content:
                            if hasattr(block, 'text'):
                                print(f"   Result:")
                                print(f"   {block.text}")
                    print("")
                except Exception as e:
                    print(f"❌ Failed to execute query: {e}")
                    import traceback
                    traceback.print_exc()
                    return False
                
                # Step 9: Disconnect
                print("Step 9: Disconnecting...")
                try:
                    await session.call_tool(
                        "disconnect",  # FIXED: No SQLcl: prefix
                        arguments={}
                    )
                    print(f"✅ Disconnected")
                    print("")
                except Exception as e:
                    print(f"⚠️  Disconnect warning: {e}")
                    print("")
                
                print("="*60)
                print("✅ ALL TESTS PASSED!")
                print("="*60)
                print("")
                print("🎉 SQLcl MCP is working correctly!")
                print("   - MCP server starts")
                print("   - Can connect to database")
                print("   - Can execute SQL queries")
                print("   - Returns data successfully")
                print("")
                return True
        
    except Exception as e:
        print(f"❌ Failed to create MCP connection: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("")
    success = asyncio.run(test_sqlcl_mcp())
    print("")
    sys.exit(0 if success else 1)
