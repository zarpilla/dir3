# DIR3 API - Spanish Administrative Relations Search

Fast, in-memory API to search Spanish administrative relations (DIR3) by NIF identifier and other criteria.

## 🚀 Features

- **Fast In-Memory Search**: All 99,618 records loaded into memory for instant queries
- **NIF Lookup**: Find administrative units by fiscal identifier (NIF)
- **Code Search**: Search by DIR3 codes (OG, OC, UT, Administration)
- **Name Search**: Partial name matching across all entities
- **API Token Authentication**: Secure access control
- **Advanced Filtering**: Combine multiple search criteria
- **CORS Enabled**: Ready for web applications

## 📊 Data Summary

- **AdminLevel 0**: 49,919 items in 50 files
- **AdminLevel 1**: 6,572 items in 7 files
- **AdminLevel 2**: 16,247 items in 17 files
- **AdminLevel 3**: 21,677 items in 22 files
- **AdminLevel 4**: 5,203 items in 6 files

**Total**: 99,618 administrative relations

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env and add your API tokens
```

## ⚙️ Configuration

Create a `.env` file:

```env
PORT=3000
API_TOKENS=your-secret-token-1,your-secret-token-2
```

**Generate secure tokens:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## � Docker Deployment

### Quick Start with Docker Compose

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env and add your API tokens

# 2. Build and start
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Stop
docker-compose down
```

### Using Pre-built Docker Image

```bash
# Pull from Docker Hub
docker pull YOUR_USERNAME/dir3-api:latest

# Run container
docker run -d \
  -p 3000:3000 \
  -e API_TOKENS=your-token-1,your-token-2 \
  --name dir3-api \
  YOUR_USERNAME/dir3-api:latest
```

### Build Docker Image Manually

```bash
# Build
docker build -t dir3-api:local .

# Run
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name dir3-api \
  dir3-api:local
```

### Docker Image Details

- **Base Image**: `node:20-alpine` (minimal size)
- **Size**: ~150MB (includes all data)
- **Architecture**: Multi-stage build for optimization
- **Health Check**: Built-in health endpoint monitoring
- **User**: Non-root user for security

## �🚀 Usage

### Start the API Server

```bash
npm start
# Server runs on http://localhost:3000
```

### Fetch Latest Data (Optional)

To update the data from FACe API:

```bash
npm run fetch
```

## 📖 API Documentation

### Authentication

All endpoints (except `/api/health`) require authentication via API token.

**Methods:**
- Header: `X-API-Key: your-token`
- Query parameter: `?apiKey=your-token`

### Endpoints

#### Health Check (Public)

```bash
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "DIR3 API",
  "version": "1.0.0",
  "totalItems": 99618,
  "indexedNIFs": 8234,
  "indexedCodes": 15432
}
```

#### Search by NIF

```bash
GET /api/search/nif/:nif
```

**Example:**
```bash
curl -H "X-API-Key: your-token" \
  http://localhost:3000/api/search/nif/Q9150016E
```

**Response:**
```json
{
  "success": true,
  "query": { "nif": "Q9150016E" },
  "count": 3,
  "results": [
    {
      "oc": { "alias": "...", "code": "...", "name": "..." },
      "og": { "alias": "...", "identifier": "Q9150016E", "code": "...", "name": "..." },
      "ut": { "alias": "...", "code": "...", "name": "..." },
      "hash": "...",
      "active": true,
      "administration": { "code": "...", "name": "..." }
    }
  ]
}
```

#### Search by Code

```bash
GET /api/search/code/:code
```

**Example:**
```bash
curl -H "X-API-Key: your-token" \
  http://localhost:3000/api/search/code/U05800001
```

#### Search by Name

```bash
GET /api/search/name/:name?limit=50
```

**Example:**
```bash
curl -H "X-API-Key: your-token" \
  "http://localhost:3000/api/search/name/universidad?limit=20"
```

#### Advanced Search (POST)

```bash
POST /api/search
Content-Type: application/json
X-API-Key: your-token
```

**Body:**
```json
{
  "nif": "Q9150016E",
  "name": "universidad",
  "active": true,
  "limit": 50
}
```

**Example:**
```bash
curl -X POST \
  -H "X-API-Key: your-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"pablo","active":true}' \
  http://localhost:3000/api/search
```

**Supported filters:**
- `nif`: Filter by fiscal identifier
- `code`: Filter by DIR3 code
- `name`: Partial name match
- `adminCode`: Filter by administration code
- `active`: Filter by active status (true/false)
- `limit`: Max results to return (default: 100)

#### Statistics

```bash
GET /api/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalItems": 99618,
    "uniqueNIFs": 8234,
    "uniqueCodes": 15432,
    "activeItems": 94215,
    "inactiveItems": 5403,
    "byAdministration": { ... }
  }
}
```

## 🔒 Security

- Never commit your `.env` file
- Use strong, randomly generated tokens
- Rotate tokens regularly
- Monitor API usage logs
- Consider rate limiting for production

## 🏗️ Architecture

**In-Memory Indexes:**
- **NIF Index**: O(1) lookup by fiscal identifier
- **Code Index**: O(1) lookup by DIR3 codes
- **Name Index**: Optimized for partial matching

**Memory Usage:** ~100MB for all data and indexes

**Startup Time:** ~2-3 seconds to load and index

## 📝 Data Structure

Each administrative relation contains:
- `oc`: Oficina Contable (Accounting Office)
- `og`: Órgano Gestor (Managing Body) - contains NIF
- `ut`: Unidad Tramitadora (Processing Unit)
- `hash`: Unique identifier
- `active`: Status flag
- `administration`: Parent administration

## 🔗 FACe API Reference

**Base URL**: `https://proveedores.face.gob.es/api/v1/relations`

**Data Fetcher**: Use `npm run fetch` to update from FACe API

## � CI/CD Deployment

### Automated Docker Hub Publishing

The project includes GitHub Actions workflow for automatic Docker image building and publishing to Docker Hub.

**Setup:**

1. **Configure GitHub Secrets** in your repository:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token

2. **Push to main/master branch**: The workflow automatically builds and pushes to Docker Hub

**Workflow triggers:**
- Push to `main` or `master` branch
- Creates two tags: `latest` and version from `package.json`

**Manual deployment:**
```bash
# Tag your commit
git tag v1.0.0
git push origin v1.0.0

# Or just push to main
git push origin main
```

**Workflow file:** `.github/workflows/docker-publish.yml`

## �📄 License

ISC

## 📅 Last Updated

June 10, 2026
