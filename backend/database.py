import json
import numpy as np
import traceback
from pathlib import Path

DATA_DIR = "backend/data"

class InternalErrorException(Exception):
  def __init__(self, *, traceback_message):
    self.type = "internal_error"
    self.traceback = traceback_message

def create_dummy_file(array_create) -> list[float]:
  arrays = [array_create]
  file_path = Path(DATA_DIR)
  if (file_path.is_dir()):
    np.save(f"{DATA_DIR}/dummy.npy",np.array(arrays))
    return arrays
  
  raise InternalErrorException(traceback.print_exc())
  
def get_dummy_array() -> list[float]:
  file_path = Path(F"{DATA_DIR}/dummy.npy")
  if (file_path.is_file()):
    arrays = np.load(f"{DATA_DIR}/dummy.npy",allow_pickle=True)
    return arrays.tolist()
  raise InternalErrorException(traceback.print_exc())