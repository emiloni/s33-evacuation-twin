import asyncio
import json

import websockets


async def test_websocket():

    uri = (
        "ws://127.0.0.1:8000"
        "/ws/evacuation/N1/EXIT1/normal"
    )

    async with websockets.connect(uri) as websocket:

        # Connection message
        message = await websocket.recv()

        print("\nConnection:")
        print(message)

        # Normal sensor state
        sensors = [
            {
                "id": "T1",
                "type": "temperature",
                "location": "N3",
                "value": 24,
                "available": True,
            },
            {
                "id": "S1",
                "type": "smoke",
                "location": "N3",
                "value": 5,
                "available": True,
            },
            {
                "id": "D1",
                "type": "door",
                "location": "EXIT1",
                "value": "open",
                "available": True,
            },
        ]

        await websocket.send(
            json.dumps({
                "sensors": sensors
            })
        )

        response = await websocket.recv()

        print("\nNormal route:")
        print(response)

        # ----------------------------------------------------
        # Simulate fire
        # ----------------------------------------------------

        sensors[0]["value"] = 85
        sensors[1]["value"] = 90

        await websocket.send(
            json.dumps({
                "sensors": sensors
            })
        )

        response = await websocket.recv()

        print("\nFire route:")
        print(response)


if __name__ == "__main__":
    asyncio.run(
        test_websocket()
    )