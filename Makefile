.PHONY: help build up down logs clean dev prod backup restore

# Default target
help:
	@echo "Available commands:"
	@echo "  build     - Build all Docker images"
	@echo "  up        - Start all services in development mode"
	@echo "  down      - Stop all services"
	@echo "  logs      - Show logs for all services"
	@echo "  clean     - Remove all containers, images, and volumes"
	@echo "  dev       - Start development environment"
	@echo "  prod      - Start production environment"
	@echo "  backup    - Backup database"
	@echo "  restore   - Restore database from backup"
	@echo "  shell-be  - Open shell in backend container"
	@echo "  shell-fe  - Open shell in frontend container"
	@echo "  shell-db  - Open database shell"

# Build all images
build:
	docker-compose build

# Start development environment
up:
	docker-compose up -d

# Start development environment with logs
up-logs:
	docker-compose up

# Stop all services
down:
	docker-compose down

# Show logs
logs:
	docker-compose logs -f

# Show logs for specific service
logs-fe:
	docker-compose logs -f frontend

logs-be:
	docker-compose logs -f backend

logs-db:
	docker-compose logs -f db

# Clean up everything
clean:
	docker-compose down -v --rmi all --remove-orphans
	docker system prune -f

# Development mode (with hot reload)
dev:
	docker-compose up -d redis
	@echo "Redis started. Run backend and frontend locally:"
	@echo "Backend: cd backend && uvicorn app.main:app --reload"
	@echo "Frontend: npm run dev"

# Production mode
prod:
	docker-compose -f docker-compose.prod.yml up -d

# Stop production
prod-down:
	docker-compose -f docker-compose.prod.yml down

# Backup database (SQLite)
backup:
	@mkdir -p backups
	cp backend/aienglish.db backups/aienglish_backup_$(shell date +%Y%m%d_%H%M%S).db
	@echo "SQLite database backup created in backups/"

# Restore database (usage: make restore BACKUP_FILE=aienglish_backup_20231201_120000.db)
restore:
	@if [ -z "$(BACKUP_FILE)" ]; then echo "Usage: make restore BACKUP_FILE=backup_file.db"; exit 1; fi
	cp backups/$(BACKUP_FILE) backend/aienglish.db
	@echo "Database restored from $(BACKUP_FILE)"

# Open shell in backend container
shell-be:
	docker-compose exec backend /bin/bash

# Open shell in frontend container
shell-fe:
	docker-compose exec frontend /bin/sh

# Open database shell (SQLite)
shell-db:
	docker-compose exec backend sqlite3 /app/aienglish.db

# Run database migrations
migrate:
	docker-compose exec backend alembic upgrade head

# Create new migration
migration:
	@if [ -z "$(MESSAGE)" ]; then echo "Usage: make migration MESSAGE='description'"; exit 1; fi
	docker-compose exec backend alembic revision --autogenerate -m "$(MESSAGE)"

# Reset database (SQLite)
reset-db:
	docker-compose down
	rm -f backend/aienglish.db
	docker-compose up -d

# Check service status
status:
	docker-compose ps

# Update and rebuild
update:
	git pull
	docker-compose build
	docker-compose up -d

# Install dependencies locally (for development)
install:
	npm install
	cd backend && pip install -r requirements.txt