#!/bin/sh

# Set default API URL if not provided
API_URL=${API_URL:-http://localhost:8080}

# Replace the placeholder in the config.js file
sed -i "s|\${API_URL}|$API_URL|g" /usr/share/nginx/html/config.js

# Start Nginx
exec nginx -g 'daemon off;'
