from pydantic import BaseModel
import numpy as np

class Dummy(BaseModel):
  array: list[float]