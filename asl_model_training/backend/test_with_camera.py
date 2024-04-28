import cv2
import numpy as np
import os
import mediapipe
from keras.models import Sequential
from keras.layers import LSTM, Dense
from keras.callbacks import TensorBoard
from keras.models import load_model

mp_drawing = mediapipe.solutions.drawing_utils
mp_holistic = mediapipe.solutions.holistic

def mediapipe_detection(image, model):
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) # converts color space from BGR to RGB which saves some memory
    image.flags.writeable = False                  # marks image as unwriteable
    results = model.process(image)                 # Makes prediction
    image.flags.writeable = True                   # converts back
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR) # converts back
    return image, results

def extract_keypoints(results):
    #pose = np.array([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]).flatten() if results.pose_landmarks else np.zeros(33*4)
    pose = np.array([[res.x, res.y, res.z] for res in results.pose_landmarks.landmark]).flatten() if results.pose_landmarks else np.zeros(33*3)
    #face = np.array([[res.x, res.y, res.z] for res in results.face_landmarks.landmark]).flatten() if results.face_landmarks else np.zeros(478*3)
    leftHand = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
    rightHand = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
    
    keypoints = np.concatenate([pose, leftHand, rightHand])
    
    return keypoints 

def draw_styled_landmarks(image, results):
    #mp_drawing.draw_landmarks(image, results.face_landmarks, mp_holistic.FACEMESH_TESSELATION,
    #                             mp_drawing.DrawingSpec(color=(68,64,71), thickness=1, circle_radius=1), # joint spec
    #                             mp_drawing.DrawingSpec(color=(119,155,0), thickness=1, circle_radius=1) # line spec 
    #                         )
    mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS,
                                 mp_drawing.DrawingSpec(color=(80,22,10), thickness=2, circle_radius=4), # joint spec
                                 mp_drawing.DrawingSpec(color=(80,44,121), thickness=2, circle_radius=2) # line spec
                             )
    mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
                                 mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4), # joint spec
                                 mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2) # line spec
                             )
    mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
                                 mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4), # joint spec
                                 mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2) # line spec
                             )
    
def get_centered_coordinates(text_size, image):
    text_width = text_size[0]
    text_height = text_size[1]

    frame_height, frame_width, _ = image.shape

    text_x = int((frame_width - text_width)/2.0)
    text_y = int((frame_height + text_height)/2.0)
    
    return (text_x, text_y)

def process_keypoints(sequence):
    processed_sequence = []
    for i in range(1, len(sequence)):
        processed_sequence.append(sequence[i]-sequence[i-1])
        print(sequence[i] - sequence[i-1])
    
    return processed_sequence

# Path for exported data, numpy arrays
DATA_DIR = os.path.join('data')
MODEL_DIR = os.path.join('models')

#signs = np.array(['hello', 'thanks', 'name'])
signs = np.array(os.listdir(DATA_DIR))

# Thirty videos worth of data
num_examples = 30

# Videos are going to be 30 frames in length
num_frames = 15

#model = Sequential()
#model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(30,258))) # 30 frames, 1662 keypoints
#model.add(LSTM(128, return_sequences=True, activation='relu'))
#model.add(LSTM(64, return_sequences=False, activation='relu'))
#model.add(Dense(64, activation='relu'))
#model.add(Dense(32, activation='relu'))
#model.add(Dense(signs.shape[0], activation='softmax'))

model = load_model(f'{MODEL_DIR}/alphabet_motion_classifier.keras')
#model.load_weights(f'{MODEL_DIR}/common_signs_lite.keras')
model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])


sequence = []
handDetected = False
reseted = True
threshold = 0.5

cap = cv2.VideoCapture(0) # access webcam
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

text_black = (0,0,0)
text_white = (255,255,255)
text_left = 20
text_first_line = 50
line_width = 30
font = cv2.FONT_HERSHEY_SIMPLEX

info_scale = 1
info_thickness = 2

center_scale = 3
center_thickness = 3

prediction = ""
prediction2 = ""
prediction3 = ""

int_min = -1
## Set mediapipe model
with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5, refine_face_landmarks=True) as holistic:
    while cap.isOpened(): # while accessing webcam
        # read feed (the current frame)
        # timer = 0
        ret, frame = cap.read() 
        
        # Make detections
        image, results = mediapipe_detection(frame, holistic) # holistic: model

        if (not handDetected and reseted):
            if (results.left_hand_landmarks or results.right_hand_landmarks):
                handDetected = True

        if not reseted and not (results.left_hand_landmarks or results.right_hand_landmarks):
            reseted = True

        # Draw landmarks
        draw_styled_landmarks(image, results)

        image = cv2.flip(image, 1)
        
        # Prediction logic
        if handDetected and reseted:
            keypoints = extract_keypoints(results)

            sequence.append(keypoints)

            res = []
            if len(sequence) == num_frames:
                sequence = process_keypoints(sequence)
                res = model.predict(np.expand_dims(sequence, axis=0))[0]
                print(res)
                # visualization logic
                if res[np.argmax(res)] > threshold:
                    prediction = signs[np.argmax(res)]
                    res[np.argmax(res)] = -1
                    prediction2 = signs[np.argmax(res)]
                    res[np.argmax(res)] = -1
                    prediction3 = signs[np.argmax(res)]
                    
                handDetected = False
                sequence = [] 
                reseted = False
            else:
                collecting_text = f"collecting: {len(sequence)} frames"
                text_size = cv2.getTextSize(collecting_text, cv2.FONT_HERSHEY_SIMPLEX, center_scale, center_thickness)[0]
                text_x, text_y = get_centered_coordinates(text_size, image)
                cv2.putText(image, collecting_text, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, center_scale, text_black, center_thickness*2, cv2.LINE_AA)
                cv2.putText(image, collecting_text, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, center_scale, text_white, center_thickness, cv2.LINE_AA)
        
        
        cv2.putText(image, f"Prediction 1: {prediction}", (text_left,text_first_line), font, info_scale, text_black, info_thickness*2, cv2.LINE_AA)
        cv2.putText(image, f"Prediction 1: {prediction}", (text_left,text_first_line), font, info_scale, text_white, info_thickness, cv2.LINE_AA)
        cv2.putText(image, f"Prediction 2: {prediction2}", (text_left,text_first_line+line_width), font, info_scale, text_black, info_thickness*2, cv2.LINE_AA)
        cv2.putText(image, f"Prediction 2: {prediction2}", (text_left,text_first_line+line_width), font, info_scale, text_white, info_thickness, cv2.LINE_AA)
        cv2.putText(image, f"Prediction 3: {prediction3}", (text_left,text_first_line+line_width*2), font, info_scale, text_black, info_thickness*2, cv2.LINE_AA)
        cv2.putText(image, f"Prediction 3: {prediction3}", (text_left,text_first_line+line_width*2), font, info_scale, text_white, info_thickness, cv2.LINE_AA)

        # show to screen (frame name, actual frame)
        cv2.imshow('OpenCV Feed', image) 
        
        # condition to close gracefully WHEN:
        #     waited for 0.01 sec for a keypress & keypress is 'q', OR
        #     the [X] button on the window is clicked
        if (cv2.waitKey(10) & 0xFF == ord('q')) or (cv2.getWindowProperty('OpenCV Feed', cv2.WND_PROP_VISIBLE) < 1): 
            break
        
cap.release()
cv2.destroyAllWindows()