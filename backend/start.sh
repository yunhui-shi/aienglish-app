#!/bin/bash
#start redis server
service redis-server start

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
while ! redis-cli -h localhost ping >/dev/null 2>&1; do
  echo "Redis is not ready yet. Waiting..."
  sleep 2
done

echo "Redis is ready!"


# Start the FastAPI application
echo "Starting FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload