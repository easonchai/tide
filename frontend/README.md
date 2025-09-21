# Tide - Prediction Market Platform

A Next.js-based prediction market platform built for the Hyperliquid ecosystem.

## Features

- Real-time cryptocurrency price tracking
- LMSR (Logarithmic Market Scoring Rule) prediction markets
- Interactive charts and data visualization
- Modern UI with responsive design

## Tech Stack

- **Framework**: Next.js 15.5.3
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── pages/           # Next.js pages and API routes
│   ├── api/         # API endpoints
│   ├── coins/       # Coin detail pages
│   └── index.tsx    # Home page
├── styles/          # CSS modules and global styles
├── utils/           # Utility functions (LMSR calculations)
└── context/         # React context providers
```

## API Endpoints

## Environment Variables

See `.env.example` for required environment variables.

## Integration with Monorepo

## Contributing

1. Follow the monorepo's coding standards
2. Ensure all linting passes
3. Test your changes thoroughly
4. Submit pull requests to the main repository

## License

This project is part of the Hyperliquid Hackathon monorepo.
