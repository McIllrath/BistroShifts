#!/bin/bash
# Start BistroShifts with PHP/MySQL

echo "Starting BistroShifts (PHP/MySQL version)..."
docker-compose -f docker-compose-php.yml --env-file .env.php up -d

echo ""
echo "Services started:"
echo "- PHP/Apache Server: http://localhost:8080"
echo "- MySQL Database: localhost:3306"
echo "- phpMyAdmin: http://localhost:8081"
echo ""
echo "To view logs: docker-compose -f docker-compose-php.yml logs -f"
echo "To stop: docker-compose -f docker-compose-php.yml down"
