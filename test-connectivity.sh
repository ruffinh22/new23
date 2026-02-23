#!/bin/bash

# Network Connectivity Test Script
# Tests if your machine can reach the SGDRA server

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER="10.0.5.18"
PORT="8081"

print_msg() {
    echo -e "${2}[TEST] ${1}${NC}"
}

print_msg "🔍 SGDRA Network Connectivity Diagnostics" "$BLUE"
print_msg "=========================================" "$BLUE"
echo ""

# Test 1: Ping
print_msg "1. Testing PING..." "$YELLOW"
if ping -c 1 -W 2 $SERVER > /dev/null 2>&1; then
    print_msg "✅ Ping successful - Server is reachable" "$GREEN"
else
    print_msg "❌ Ping failed - Server is NOT reachable" "$RED"
    echo "   Fix: Check your network connection or firewall"
fi
echo ""

# Test 2: TCP Connection
print_msg "2. Testing TCP Port $PORT..." "$YELLOW"
if timeout 3 bash -c "</dev/tcp/$SERVER/$PORT" 2>/dev/null; then
    print_msg "✅ TCP port $PORT is open" "$GREEN"
else
    print_msg "❌ Cannot connect to port $PORT" "$RED"
    echo "   Fix: Check firewall rules or network routing"
fi
echo ""

# Test 3: HTTP Request
print_msg "3. Testing HTTP Request..." "$YELLOW"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER:$PORT/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    print_msg "✅ HTTP request successful (200 OK)" "$GREEN"
elif [ "$HTTP_CODE" != "000" ]; then
    print_msg "⚠️  HTTP request returned: $HTTP_CODE" "$YELLOW"
else
    print_msg "❌ Cannot reach HTTP service" "$RED"
    echo "   Fix: Check Nginx is running: docker ps | grep nginx"
fi
echo ""

# Test 4: Network Interface
print_msg "4. Detecting Network Interfaces..." "$YELLOW"
echo "   Local IP addresses:"
if command -v ip &> /dev/null; then
    ip addr show 2>/dev/null | grep "inet " | awk '{print "   - " $2}' || echo "   Could not detect"
else
    ifconfig 2>/dev/null | grep "inet " | awk '{print "   - " $2}' || echo "   Could not detect"
fi
echo ""

# Summary
print_msg "=========================================" "$BLUE"
echo ""
if [ "$HTTP_CODE" = "200" ]; then
    print_msg "✅ CONNECTIVITY OK - Access application at:" "$GREEN"
    print_msg "    http://10.0.5.18:8081" "$GREEN"
else
    print_msg "⚠️  CONNECTIVITY ISSUES - Try these solutions:" "$YELLOW"
    echo ""
    echo "  1. Verify server is reachable:"
    echo "     ping 10.0.5.18"
    echo ""
    echo "  2. Test port directly:"
    echo "     telnet 10.0.5.18 8081"
    echo ""
    echo "  3. Use SSH tunnel if direct access blocked:"
    echo "     ssh -L 8081:10.0.5.18:8081 erpgmc@10.0.5.18"
    echo "     Then access: http://localhost:8081"
    echo ""
    echo "  4. Check your firewall:"
    echo "     Windows: Settings > Windows Defender Firewall"
    echo "     Mac: System Preferences > Security & Privacy"
    echo "     Linux: sudo ufw status"
fi
echo ""
