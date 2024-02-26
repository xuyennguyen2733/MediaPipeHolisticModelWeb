import numpy as np
from keras.models import Sequential, load_model
from keras.layers import LSTM, Dense
from sklearn.model_selection import train_test_split
from keras.utils import to_categorical
import os

sign_set_1 = ['hello','learn','name','forget', 'sorry', 'thanks', 'understand']
alphabet_set = ['!none', 'j', 'z']

class HelloWorldModel:
  def __init__(self,model_name="alphabet_motion_classifier_diff", signs=alphabet_set):
    self.signs = np.array(signs)
    self.model = self._build_model()
    self.data_dir = os.path.join("backend","data")
    self.model_dir = os.path.join("backend","models")
    self.model = self._load_model(os.path.join(self.model_dir,f"{model_name}.keras"))

  def _load_model(self, model_path):
    model = load_model(model_path)
    model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])
    return model
     

  def _build_model(self):
    model = Sequential()
    model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(15,225))) # 30 frames, 1692 keypoints
    model.add(LSTM(128, return_sequences=True, activation='relu'))
    model.add(LSTM(64, return_sequences=False, activation='relu'))
    model.add(Dense(64, activation='relu'))
    model.add(Dense(32, activation='relu'))
    model.add(Dense(self.signs.shape[0], activation='softmax'))

    model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])
    return model
  
  def _rebuild_model(self, signs=None):
    signs = np.array(signs)
    if signs and not (signs == self.signs).all() :
      self.signs = signs
      self.model.pop
      self.model.add(Dense(self.signs.shape[0], activation='softmax'))
      self.model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])

    raise Exception("Please provide a list of new signs")

  def create_model(self, signs, model_name):
    file_path = f"{self.model_dir}/{model_name}.keras"
    if os.path.isfile(file_path):
       raise Exception("A model with the same name already exists. Please choose another name.")
    self._rebuild_model(signs)
    x_train, x_test, y_train, y_test = self._load_data()
    self.model.fit(x_train, y_train, epochs=200)
    evaluation = self.model.evaluate(x_test,y_test)
    np.save(file_path)
    return evaluation # test loss: evaluation[0]; test accuracy: evaluation[1]

  def retrain_model(self, model_name):
    file_path = f"{self.model_dir}/{model_name}.keras"
    if os.path.isfile(file_path):
      x_train, x_test, y_train, y_test = self._load_data()
      self.model.fit(x_train, y_train, epochs=200)
      evaluation = self.model.evaluate(x_test,y_test)
      np.save(file_path)
      return evaluation

    raise Exception("The model doesn't exist!")
  
  def predict(self, array):
    sequence = []
    sequence.append(array)
    res = self.model.predict(np.expand_dims(array, axis=0))[0]
    prediction1 = self.signs[np.argmax(res)]
    score1 = res[np.argmax(res)]
    res[np.argmax(res)] = -1
    prediction2 = self.signs[np.argmax(res)]
    score2 = res[np.argmax(res)]
    res[np.argmax(res)] = -1
    prediction3 = self.signs[np.argmax(res)]
    score3=res[np.argmax(res)]
    return ([prediction1,prediction2,prediction3],[score1,score2,score3])
  
  def set_model(self, num_labels, model_name):
    file_path = f"{self.model_dir}/{model_name}.keras"
    if os.path.isfile(file_path):
      self.model.pop
      self.model.add(Dense(num_labels, activation='softmax'))
      self.model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])
      self.model.load_weights(file_path)

    raise Exception("The model doesn't exist!")

  def _load_data(self, no_sequences=30, seuqnce_length=30):

    for sign in self.signs:
        for sequence in range(no_sequences):
            try:
                os.makedirs(os.path.join(self.data_dir, sign, str(sequence)))
            except:
                pass
            
    label_map = {label:num for num, label in enumerate(self.signs)}

    sequences, labels = [], []
    for sign in self.signs:
        for sequence in range(no_sequences):
            window = []
            for frame_num in range(sequence_length):
                res = np.load(os.path.join(self.data_dir, sign, str(sequence), "{}.npy".format(frame_num)))
                window.append(res)
            sequences.append(window)
            labels.append(label_map[sign])

    x = np.array(sequences)
    y = to_categorical(labels).astype(int)

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.05)
    return (x_train,x_test,y_train,y_test)