# FACe API Data Fetcher

Node.js script to download administrative relations data from the Spanish FACe (Facturación Electrónica) public API.

## Overview

This script fetches all administrative relations from the FACe provider API across 5 different administrative levels (0-4) and stores the data as JSON files in the `output` directory.

## Data Summary

The repository includes pre-fetched data with the following statistics:

- **AdminLevel 0**: 49,919 items in 50 files
- **AdminLevel 1**: 6,572 items in 7 files
- **AdminLevel 2**: 16,247 items in 17 files
- **AdminLevel 3**: 21,677 items in 22 files
- **AdminLevel 4**: 5,203 items in 6 files

**Total**: 99,618 administrative relations in 102 JSON files

## Installation

```bash
npm install
```

## Usage

To fetch the latest data from the API:

```bash
node index.js
```

The script will:
- Fetch data from all admin levels (0-4)
- Save each page as a separate JSON file in `output/`
- Add a 1.5 second delay between requests to avoid rate limiting
- Display progress and completion summary

## Configuration

You can modify the following constants in `index.js`:

- `LIMIT`: Items per page (default: 1000)
- `ADMIN_LEVELS`: Array of admin levels to fetch (default: [0, 1, 2, 3, 4])
- `DELAY_MS`: Delay between requests in milliseconds (default: 1500)
- `OUTPUT_DIR`: Output directory path (default: `./output`)

## Output Format

Files are saved with the naming pattern:
```
output/adminLevel-{level}-page-{page}.json
```

Each JSON file contains:
- `items`: Array of administrative relations
- `count`: Number of items in current response
- `total`: Total number of items available
- `limit`: Items per page
- `page`: Current page number

## API Reference

**Base URL**: `https://proveedores.face.gob.es/api/v1/relations`

**Parameters**:
- `adminLevel`: Administrative level (0-4)
- `limit`: Items per page (max: 1000)
- `page`: Page number (starts at 1)

**Example**:
```
https://proveedores.face.gob.es/api/v1/relations?adminLevel=0&limit=1000&page=1
```

## Data Structure

Each administrative relation contains:
- `oc`: Oficina Contable (Accounting Office)
- `og`: Órgano Gestor (Managing Body)
- `ut`: Unidad Tramitadora (Processing Unit)
- `hash`: Unique identifier
- `active`: Status flag
- `administration`: Parent administration details

## License

ISC

## Last Updated

June 7, 2026
