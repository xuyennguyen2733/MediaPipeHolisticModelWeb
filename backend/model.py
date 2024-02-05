import numpy as np
from keras.models import Sequential
from keras.layers import LSTM, Dense

class HelloWorldModel:
  def __init__(self):
    self.actions = np.array(['hello', 'thanks', 'name'])
    self.model = self._build_model()
    self.model.load_weights("backend/hello_world.keras")

  def _build_model(self):
    model = Sequential()
    model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(30,1692))) # 30 frames, 1662 keypoints
    model.add(LSTM(128, return_sequences=True, activation='relu'))
    model.add(LSTM(64, return_sequences=False, activation='relu'))
    model.add(Dense(64, activation='relu'))
    model.add(Dense(32, activation='relu'))
    model.add(Dense(self.actions.shape[0], activation='softmax'))

    model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])
    return model
  
  def predict(self, array):
    sequence = []
    sequence.append(array)
    res = self.model.predict(np.expand_dims(array, axis=0))[0]
    return self.actions[np.argmax(res)]
