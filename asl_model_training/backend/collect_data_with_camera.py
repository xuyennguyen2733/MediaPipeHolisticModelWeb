import cv2
import numpy as np
import os
import mediapipe
# initialize holistic model detector and drawing utilities
mp_drawing = mediapipe.solutions.drawing_utils
mp_holistic = mediapipe.solutions.holistic

# create usefule functions

# take the image of a frame from the video and process it to detect face, pose, and hands
def mediapipe_detection(image, model):
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) # converts color space from BGR to RGB which saves some memory
    image.flags.writeable = False                  # marks image as unwriteable
    results = model.process(image)                 # Makes prediction
    image.flags.writeable = True                   # converts back
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR) # converts back
    return image, results

# extract the keypoints (vertex coordinates) of the face, pose, and 
# hands and process them into arrays of desired formats and concatenate them
# in to 1 big array of size 1692
def extract_keypoints(results):
    pose = np.array([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]).flatten() if results.pose_landmarks else np.zeros(33*4)
    face = np.array([[res.x, res.y, res.z] for res in results.face_landmarks.landmark]).flatten() if results.face_landmarks else np.zeros(478*3)
    leftHand = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(21*3)
    rightHand = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(21*3)
    
    keypoints = np.concatenate([pose, face, leftHand, rightHand])
    
    return keypoints 

# use the drawing utilities to draw the landmarks onto the video frames
def draw_styled_landmarks(image, results):
    mp_drawing.draw_landmarks(image, results.face_landmarks, mp_holistic.FACEMESH_TESSELATION,
                                 mp_drawing.DrawingSpec(color=(68,64,71), thickness=1, circle_radius=1), # joint spec
                                 mp_drawing.DrawingSpec(color=(119,155,0), thickness=1, circle_radius=1) # line spec 
                             )
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
    
# get the coordinates for drawing text in the center of the video
def get_centered_coordinates(text_size, image):
    text_width = text_size[0]
    text_height = text_size[1]

    frame_height, frame_width, _ = image.shape

    text_x = int((frame_width - text_width)/2.0)
    text_y = int((frame_height + text_height)/2.0)
    
    return (text_x, text_y)

def create_file_path():
    for num in range(num_examples):
        try:
            os.makedirs(os.path.join(DATA_DIR, label_to_train, str(num)))
        except:
            pass


# initialize necessary variables
label_to_train = "hit 'e' to enter new label in the command prompt"
set_number = 0 # keep track of number of datapoints (example) collected
frame_number = 0 # keep track of the number of frames collected for each datapoint
num_examples = 30 # collecting 30 datapoints for training
num_frames = 30 # each data point has keypoints extracted from 30 frames
handDetected = False
isCollecting = False
hasLabel = False
reseted = True

# initialize on-screen text configurations 
text_white = (255,255,255)
text_black = (0,0,0)
font = cv2.FONT_HERSHEY_SIMPLEX

hit_s_text = f"Hit 'S' to start collecting data"
center_scale = 3
center_thickness = 3
text_size = cv2.getTextSize(hit_s_text, font, center_scale, center_thickness)[0]

frame_text = f"collecting: {frame_number} frames"
frame_text_size = cv2.getTextSize(frame_text, font, center_scale, center_thickness)[0]

info_scale = 1
info_thickness = 2
text_left = 20
text_first_line = 50

# Path for exported data, numpy arrays
#DATA_DIR = os.path.join('HolisticApp/backend/data')
DATA_DIR = os.path.join('data')
MODEL_DIR = os.path.join('models')
file_path = os.path.join(f"{DATA_DIR}/{label_to_train}/{set_number}")

# initialize and set the dimensions of video
cap = cv2.VideoCapture(0) # access webcam
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

## Set mediapipe model
# Notes: the variable 'refine_face_landmarks' is important to keep the array dimension consistent.
    # if set to false, the face landmarks only has 468 vertices, which make it incompatible with our
    # current code
with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5, refine_face_landmarks=True) as holistic:
    while cap.isOpened(): # while accessing webcam
        # read feed (the current frame)
        ret, frame = cap.read() 
        
        # Make detections
        image, results = mediapipe_detection(frame, holistic) # holistic: model

        # checks if a hand is detected for the FIRST time
        if (not handDetected and isCollecting and hasLabel and reseted):
            if (results.left_hand_landmarks or results.right_hand_landmarks):
                handDetected = True

        if not reseted and not (results.left_hand_landmarks or results.right_hand_landmarks):
            reseted = True
        # Draw landmarks
        draw_styled_landmarks(image, results)

        # Makes the video mirror the user
        # Do not make this before the detections or handednesses will be
        # classified incorrectly (i.e. right hand will be classified as left )
        image = cv2.flip(image, 1)
        
        # Start collecting landmark data from frames as soon as
        # a hand is detected for the first time.
        # stop collecting when reaching 30 examples (or whatever number of examples you wish to collect - see the while condition)
        if handDetected and isCollecting and hasLabel and reseted:
          keypoints = extract_keypoints(results)
          np.save(f"{file_path}/{frame_number}.npy",np.array(keypoints))
          
          frame_number += 1
     
          if frame_number == num_frames:
              frame_number = 0
              set_number += 1
              file_path = os.path.join(f"{DATA_DIR}/{label_to_train}/{set_number}")
              handDetected = False
              reseted = False
          elif frame_number != 0:
              frame_text_x, frame_text_y = get_centered_coordinates(frame_text_size, image)
              cv2.putText(image, frame_text, (frame_text_x, frame_text_y), font, center_scale, text_black, center_thickness*2, cv2.LINE_AA)
              cv2.putText(image, frame_text, (frame_text_x, frame_text_y), font, center_scale, text_white, center_thickness, cv2.LINE_AA)
          if set_number == num_examples:
              set_number = 0
              isCollecting = False
              hasLabel = False
              label_to_train = "hit 'e' to enter new label in the command prompt"
        
        # print data information on the screen
        if (not isCollecting and hasLabel):
            # print instruction to start collecting in the middle of the video
            hit_s_x, hit_s_y = get_centered_coordinates(text_size, image)
            cv2.putText(image, hit_s_text, (hit_s_x, hit_s_y),font, center_scale, text_white, center_thickness, cv2.LINE_AA)
        cv2.putText(image, f"Data set count: {set_number}", (text_left,text_first_line), font, info_scale, text_black, info_thickness*2, cv2.LINE_AA)
        cv2.putText(image, f"Data set count: {set_number}", (text_left,text_first_line), font, info_scale, text_white, info_thickness, cv2.LINE_AA)
        cv2.putText(image, f"Training for label: {label_to_train}", (text_left,text_first_line+30), font, info_scale, text_black, info_thickness*2, cv2.LINE_AA)
        cv2.putText(image, f"Training for label: {label_to_train}", (text_left,text_first_line+30), font, info_scale, text_white, info_thickness, cv2.LINE_AA)

        # show to screen (frame name, actual frame)
        cv2.imshow('OpenCV Feed', image) 
        
        # condition to close gracefully WHEN:
        #     waited for 0.01 sec for a keypress & keypress is 'q', OR
        #     the [X] button on the window is clicked
        
        key = cv2.waitKey(10) & 0xFF

        if key == ord('s') or key == ord('S'):
            isCollecting = True
        if key == ord('e') or key == ord('E'):
            label_to_train = input("New label: ")
            create_file_path()
            file_path = os.path.join(f"{DATA_DIR}/{label_to_train}/{set_number}")
            hasLabel = True
        if (key == ord('q')) or (cv2.getWindowProperty('OpenCV Feed', cv2.WND_PROP_VISIBLE) < 1): 
            break
        
cap.release()
cv2.destroyAllWindows()