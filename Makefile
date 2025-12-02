.PHONY: up migrate seed down build

up:
	docker-compose up -d --build

migrate:
	docker-compose exec server npm run migrate

seed:
	docker-compose exec server node scripts/seed_users_and_shifts.js

down:
	docker-compose down

build:
	docker-compose build
