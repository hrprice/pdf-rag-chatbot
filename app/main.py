import asyncio
import hashlib
import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from google.auth.transport import requests
from google.oauth2 import id_token
from langchain_core.messages import HumanMessage, SystemMessage
from rag import get_client

load_dotenv()

firebase_request_adapter = requests.Request()
app = FastAPI()
client = get_client()

initial_system_message = ""
with open(os.getenv("SYSTEM_PROMPT"), "r") as f:
    initial_system_message = f.read()


async def verify_firebase_token(token: str):
    """
    Verifies the Firebase token using Google's OAuth2 API.
    """
    try:
        claims = id_token.verify_firebase_token(token, firebase_request_adapter)
        return claims
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(exc)}")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket, token):
    await websocket.accept()

    try:
        # Verify the Firebase token
        await verify_firebase_token(token)

        # Send authenticated response
        await websocket.send_json(
            {
                "message_type": "info",
                "content": "Authenticated successfully",
            }
        )

        random_bytes = os.urandom(16)
        hash_object = hashlib.sha256(random_bytes)
        random_hash = hash_object.hexdigest()
        prev = ""
        first_message = True

        while True:
            message = await asyncio.wait_for(websocket.receive_text(), timeout=600)
            async for event in client.astream_events(
                {
                    "messages": [
                        SystemMessage(initial_system_message),
                        HumanMessage(content=message),
                    ]
                    if first_message
                    else [HumanMessage(content=message)]
                },
                stream_mode="values",
                version="v1",
                config={"configurable": {"thread_id": random_hash}},
            ):
                if (
                    event["event"] == "on_chain_stream"
                    and event["name"]
                    in [
                        "LangGraph",
                        "generate",
                    ]
                    and "answer" in event["data"]["chunk"]
                    and event["data"]["chunk"]["answer"] != prev
                ):
                    line = event["data"]["chunk"]["answer"]
                    await websocket.send_json(
                        {"message_type": "chat_response", "content": line}
                    )
                    prev = line
            first_message = False
    except HTTPException as error:
        await websocket.send_json({"message_type": "error", "content": error.detail})
        await websocket.close()
    except asyncio.TimeoutError:
        print("Timeout: No message received")
        await websocket.send_json(
            {
                "message_type": "error",
                "content": "Timeout: No message received, connection closing. Refresh page.",
            }
        )
        await websocket.close()
    except Exception:
        await websocket.send_json(
            {
                "message_type": "error",
                "content": "Internal server error. Connection closed.",
            }
        )
        await websocket.close()
    except WebSocketDisconnect:
        print("WebSocket disconnected")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        log_level="debug",
        reload=True,
    )
