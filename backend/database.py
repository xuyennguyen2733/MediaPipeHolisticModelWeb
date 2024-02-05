import json
import numpy as np
import traceback
from pathlib import Path
from backend.entities import TrainDataResponse

DATA_DIR = "backend/data"

class InternalErrorException(Exception):
  def __init__(self, *, traceback_message):
    self.type = "internal_error"
    self.traceback = traceback_message

def create_training_file(array_create) -> TrainDataResponse:
  file_path = Path(f"{DATA_DIR}/{array_create.label}/")
  file_path.mkdir(parents=True, exist_ok=True)
  if (file_path.is_dir()):
    np.save(f"{file_path}/{array_create.frameNumber}.npy",np.array(array_create.array))
    return len(array_create.array)
  
  raise InternalErrorException(traceback.print_exc())

def create_dummy_file(array_create) -> list[float]:
  file_path = Path(DATA_DIR)
  if (file_path.is_dir()):
    np.save(f"{DATA_DIR}/dummy.npy",np.array(array_create))
    return array_create
  
  raise InternalErrorException(traceback.print_exc())
  
def get_dummy_array() -> list[float]:
  file_path = Path(F"{DATA_DIR}/dummy.npy")
  if (file_path.is_file()):
    arrays = np.load(f"{DATA_DIR}/dummy.npy",allow_pickle=True)
    return arrays.tolist()
  raise InternalErrorException(traceback.print_exc())