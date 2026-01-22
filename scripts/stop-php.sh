#!/bin/bash
# Stop BistroShifts PHP/MySQL version

echo "Stopping BistroShifts (PHP/MySQL version)..."
docker-compose -f docker-compose-php.yml down

echo "Services stopped."
