from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse

from backend import database as db
from backend.database import InternalErrorException
from backend.entities import (Dummy)

app = FastAPI(
  title="ASL Model Trainer",
  description="Web App for training and testing ASL machine learning model",
  version="0.1.0"
)

@app.exception_handler(InternalErrorException)
def handle_generic_exception(
  _request: Request,
  exception: InternalErrorException
) -> JSONResponse:
  return JSONResponse(
    status_code=500,
    content={
      "detail":{
        "type": exception.type,
        "error": exception.traceback
      }
    }
  )

@app.get(
  "/",
)
def hello_world():
  return "Hello World!"

@app.post(
  "/dummy",
)
def create_dummy(array_create: Dummy):
  return db.create_dummy_file(array_create)

@app.get(
  "/dummy"
)
def get_dummy():
  return db.get_dummy_array()