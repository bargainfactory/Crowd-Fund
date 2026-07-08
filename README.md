# CrowdfundAfrica Monorepo

Multilingual, multi-currency crowdfunding platform with blockchain transparency and African payment gateways.

## Structure

- `frontend/` – Next.js 14 PWA (React 18, Tailwind CSS, next-i18next).
- `backend/` – Express API (MongoDB, Redis, Stripe, Flutterwave, Paystack, blockchain service).
- `blockchain/` – Hardhat project with `CrowdfundFactory` and `CrowdfundCampaign` Solidity contracts.

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 7+

### Backend

```bash
cd backend
cp .env.example .env   # fill with your secrets
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local  # create if needed
# Set NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev
```

Frontend runs on `http://localhost:3000` and registers as a PWA with offline support and install banner.

## Docker & Docker Compose

For a local production-like stack:

```bash
docker-compose up --build
```

This starts:

- `mongo` (MongoDB)
- `redis` (Redis)
- `backend` (Express API on port 5000)
- `frontend` (Next.js app on port 3000)

Update `backend/.env` for production-grade secrets before deploying.

## Blockchain Setup (Polygon Mumbai / Sepolia)

1. In `blockchain/`, configure your networks in `hardhat.config.js` with `ALCHEMY_API_KEY` and `PRIVATE_KEY`.
2. Deploy the factory contract:

```bash
cd blockchain
npm install
npx hardhat run scripts/deploy.js --network polygonMumbai
```

3. Copy the deployed factory address into `CROWDFUND_FACTORY_ADDRESS` in `backend/.env`.
4. Set `ALCHEMY_API_KEY` and `ALCHEMY_NETWORK` (`polygon-mumbai` by default).

## CI / CD

GitHub Actions workflow in `.github/workflows/ci.yml` runs:

- Backend Jest tests (`backend/`).
- Frontend lint and Jest tests (`frontend/`).

## Tests

- Backend: Jest + supertest, config in `backend/jest.config.cjs`, tests under `backend/src/__tests__/`.
- Frontend: Jest + React Testing Library, config in `frontend/jest.config.cjs`, tests under `frontend/src/__tests__/`.

Run tests:

```bash
cd backend && npm test
cd frontend && npm test
```

## Key Features (Implemented)

- JWT auth with 2FA, OAuth (Google / Facebook) and robust session handling.
- Campaign creation, management, community grouping, milestones and updates.
- Donations via Stripe, Flutterwave (cards, CFA, mobile money) and Paystack.
- Multi-currency with live FX via Open Exchange Rates + Redis cache.
- Optional blockchain transparency with Polygon-based escrow contracts and logs.
- Multilingual UI (English, French, Spanish, Arabic, Wolof) with auto detection and manual switcher.
- PWA with offline support, install prompts and small runtime cache for campaigns API.

