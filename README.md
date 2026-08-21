# S33 Evacuation Digital Twin

An intelligent digital twin for multi-floor building evacuation and emergency management.

## Features

- 3D digital twin visualization
- Multi-floor building support
- Occupant and hazard visualization
- Mobility-aware evacuation routing
- Fire and emergency simulation
- Custom building and floor-plan upload
- JWT authentication
- Simulation saving and history

## Tech Stack

Frontend: Next.js, React, TypeScript, Tailwind CSS, Three.js

Backend: FastAPI, Python, SQLAlchemy, JWT, SQLite

## Project Structure

frontend/   # Next.js frontend
backend/    # FastAPI backend
routing/    # Routing modules
simulation/ # Simulation modules
data/       # Data
tests/      # Tests
docs/       # Documentation

## Run

Frontend:

cd frontend
npm install
npm run dev

Backend:

pip install -r requirements.txt
uvicorn backend.main:app --reload

Frontend: http://localhost:3000
Backend: http://localhost:8000

## Status

Prototype for the S33 evacuation digital twin and emergency evacuation management system.
