#!/bin/bash

# Rob Store API Setup Script
# Installs PostgreSQL, Node.js dependencies, and sets up the database

set -e

echo "🚀 Rob Store API Setup"
echo "======================"

# Update system packages
echo ""
echo "📦 Updating system packages..."
sudo apt-get update -y

# Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    echo ""
    echo "🐘 Installing PostgreSQL..."
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
else
    echo "✅ PostgreSQL already installed"
fi

# Create database and user
echo ""
echo "🗄️  Setting up database..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE robstore OWNER postgres;" 2>/dev/null || echo "Database already exists"

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo ""
    echo "📗 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node -v)"
fi

# Copy .env.example to .env if .env doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env created from .env.example"
else
    echo "✅ .env file already exists"
fi

# Install npm dependencies
echo ""
echo "📥 Installing npm dependencies..."
npm install

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo ""
echo "🗃️  Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the server, run:"
echo "   npm start"
echo ""
echo "📡 API will be available at: http://localhost:3000"