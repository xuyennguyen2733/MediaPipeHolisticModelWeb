import numpy as np
import os
from sklearn.model_selection import train_test_split
from keras.utils import to_categorical
from keras.models import Sequential, load_model
from keras.layers import LSTM, Dense
from keras.callbacks import TensorBoard
#import tensorflowjs as tfjs

# Path for exported data, numpy arrays
DATA_DIR = os.path.join('data')
MODEL_DIR = os.path.join('models')

# Action that we try to detect
# actions = np.array(['hello', 'thanks', 'iloveyou', 'I', 'you', 'deaf', 'hearing', 'what_question', 'what_relative_clause'])
signs = np.array(os.listdir(DATA_DIR))
print(signs)

# Thirty videos worth of data
num_examples = 100

# Videos are going to be 30 frames in length
num_frames = 15

num_keypoints = 225 # sum of number of x, y, z coordinates from landmarks being used (in this case, pose and 2 hands)
       
label_map = {label:num for num, label in enumerate(signs)}

sequences, labels = [], []
for sign in signs:
    for example_index in range(num_examples):
        window = []
        for frame_index in range(num_frames):
            res = np.load(os.path.join(DATA_DIR, sign, str(example_index), "{}.npy".format(frame_index)))
            window.append(res)
        sequences.append(window)
        labels.append(label_map[sign])

x = np.array(sequences)
y = to_categorical(labels).astype(int)
print("x shape",x.shape)
print("y shape", y.shape)

x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.05)

log_dir = os.path.join('Logs')
tb_callback = TensorBoard(log_dir=log_dir) # web app to monitor training

model = Sequential()
#model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(30,1692))) # 30 frames, 1692 keypoints
model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(num_frames,num_keypoints)))
model.add(LSTM(128, return_sequences=True, activation='relu'))
model.add(LSTM(64, return_sequences=False, activation='relu'))
model.add(Dense(64, activation='relu'))
model.add(Dense(32, activation='relu'))
model.add(Dense(signs.shape[0], activation='softmax'))

model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])

model.fit(x_train, y_train, epochs=200, callbacks=[tb_callback])

print('Model sumary', model.summary())

# SAVE A TFJS MODEL. Uncomment line 63 and comment out line 66
#tfjs.converters.save_keras_model(model,f"{MODEL_DIR}/")

# SAVE A KERAS MODEL. Uncomment line 66 and comment out line 63
model.save(f'{MODEL_DIR}/alphabet_motion_classifier.keras') # save model
