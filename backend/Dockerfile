# Multi-stage build for AI English Learning App

# Backend stage with Python virtual environment
FROM python:3.12-slim AS backend
WORKDIR /app

# Install system dependencies including curl for uv installation
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    redis-tools \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

# Install uv for faster package management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Copy pyproject.toml and uv.lock for dependency installation
COPY pyproject.toml .

# Create virtual environment and install dependencies
RUN uv venv /app/.venv
ENV VIRTUAL_ENV=/app/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install dependencies using uv
RUN uv pip install -r pyproject.toml

# Copy backend application code
COPY app ./app

# copy env
COPY .env .

# Copy the start script
COPY start.sh .
RUN chmod +x ./start.sh

# Expose backend port
EXPOSE 8000

# Start the application
CMD ["./start.sh"]