from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from backend import database as db
from backend.database import InternalErrorException
from backend.entities import (Dummy, TrainDataInput, TrainDataResponse, PredictDataInput, PredictDataResponse)
from backend.model import HelloWorldModel
from backend.sequence_aggregator import SequenceAggregator

app = FastAPI(
  title="ASL Model Trainer",
  description="Web App for training and testing ASL machine learning model",
  version="0.1.0"
)

model = HelloWorldModel()



    
sequence_aggregator = SequenceAggregator()

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
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
  #response_model=Dummy
)
def create_dummy(array_create: list[float]):
  return Dummy(array=db.create_dummy_file(array_create))

@app.get(
  "/dummy",
)
def get_dummy():
  return Dummy(array=db.get_dummy_array())

@app.post(
  "/train"
)
def create_training_data(array_create: TrainDataInput):
  return TrainDataResponse(length=db.create_training_file(array_create))

@app.post(
  "/predict"
)
def create_testing_data(array_create: PredictDataInput):
  full_sequence = sequence_aggregator.add_partial_sequence(array_create.array)
  if full_sequence is not None:
    prediction = model.predict(full_sequence)
    sequence_aggregator.clear_partial_sequence()
    return PredictDataResponse(prediction=prediction)
