#!/bin/bash

# Simple script to run the Tower Defense game
# This starts a local web server so the game can be accessed via browser

PORT=8000

echo "Starting Tower Defense Game server..."
echo "Game will be available at: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
# Check if Python 2 is available
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
# Check if Node.js is available
elif command -v npx &> /dev/null; then
    npx http-server -p $PORT
else
    echo "Error: No suitable web server found."
    echo "Please install Python 3, Python 2, or Node.js"
    echo ""
    echo "Alternatively, you can open index.html directly in your browser"
    exit 1
fi

