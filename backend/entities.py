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