"""Start the pipeline UI server: python -m ui.server  (localhost only)."""

import uvicorn

HOST = "127.0.0.1"  # never listen on another interface: the API runs commands on this machine
PORT = 8765

if __name__ == "__main__":
    print(f"Pipeline UI API on http://{HOST}:{PORT}  (docs: http://{HOST}:{PORT}/api/docs)")
    uvicorn.run("ui.server.app:app", host=HOST, port=PORT)
