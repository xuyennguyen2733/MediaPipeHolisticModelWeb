from pydantic import BaseModel
import numpy as np

class Dummy(BaseModel):
  array: list[float]

class TrainDataResponse(BaseModel):
  length: int

class TrainDataInput(BaseModel):
  array: list[float]
  label: str
  frameNumber: int
  setNumber: int

class PredictDataInput(BaseModel):
  array: list[float]
  label: str
  frameNumber: int

class PredictDataResponse(BaseModel):
  prediction1: str
  score1: float
  prediction2: str
  score2: float
  prediction3: str
  score3: float
