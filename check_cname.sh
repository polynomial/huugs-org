#!/bin/bash

# Use curl to query a DNS lookup service
echo "Checking CNAME record for www.huugs.org..."
curl -s "https://dns.google/resolve?name=www.huugs.org&type=CNAME" | grep -o '"data":"[^"]*"' | cut -d'"' -f4 