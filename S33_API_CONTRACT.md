# S33 API Contract

## POST /api/v1/evacuation/route

Calculates an evacuation route using current sensor state,
hazards, mobility constraints and NetworkX Dijkstra.

### Request

```json
{
  "start": "N1",
  "destination": "EXIT1",
  "mobility": "normal",
  "sensors": []
}