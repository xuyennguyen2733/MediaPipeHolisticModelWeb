import { useQuery } from "react-query";
import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import {
  GestureRecognizer,
  PoseLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { FilesetResolver } from "@mediapipe/tasks-text";
import "./ModelStyles.css";

function VideoCanvas({ webcamRef, canvasRef, cameraActive }) {
  const [tick, setTick] = useState(0);
  const gestureRecognizer = useRef(null);
  const poseLandmarker = useRef(null);
  const [canvasCtx, setCanvasCtx] = useState(null);
  const [videoWidth, setVideoWidth] = useState(1280);
  const [videoHeight, setVideoHeight] = useState(720);
  const [landmarkSequence, setSequence] = useState([]);
  const [predicting, setPredicting] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  const [frameCount, setFrameCount] = useState(16);
  const [intervalDuration, setIntervalDuration] = useState(30);
  const [videoConstraints, setVideoContraints] = useState({
    //width: videoWidth,
    //height: videoHeight,
    aspectRatio: 16 / 9,
  });
  const sendData = async () => {
    try {
      setIsSending(true);
      let response;
      for (let i = 0; i < frameCount - 1; i++) {
        const nextLandmarks = landmarkSequence[i + 1];
        const currentLandmarks = landmarkSequence[i];
        response = await fetch("http://127.0.0.1:8000/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            array: nextLandmarks.map(
              (nextLandmarkValue, landmarkIndex) =>
                nextLandmarkValue - currentLandmarks[landmarkIndex]
            ),
            label: "",
            frameNumber: i,
          }),
        });
        if (!response.ok) {
          console.log("api response not OK");
          return false;
        } else {
          console.log("posted training data successfully");
        }
      }
      setResult(await response.json());
      setIsSending(false);
      return true;
    } catch (error) {
      console.error("Error posting data:", error);
    }
  };

  const toggleOnCollect = () => {
    setPredicting(true);
    setSequence([]);
    setHandDetected(false);
  };

  const toggleOffCollect = () => {
    setPredicting(false);
    setSequence([]);
    setHandDetected(false);
  };

  const toggleCollect = () => {
    setPredicting(!predicting);
    setSequence([]);
    setHandDetected(false);
  };

  const continueCollect = async () => {
    const succeeded = await sendData();
    if (succeeded) {
      toggleOnCollect();
    }
  };

  const resetBackendQueue = async () => {
    response = await fetch("http://127.0.0.1:8000/clear-queue", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      console.log("api response not OK");
      return false;
    }
  };

  useEffect(() => {
    if (webcamRef.current) {
      //webcamRef.current.video.videoWidth = videoWidth;
      //webcamRef.current.video.videoHeight = videoHeight;
    }
    // Create gesture recognizer which in cludes hand landmarks and a sign recognizer
    const createRecognizers = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      gestureRecognizer.current = await GestureRecognizer.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        }
      );
      poseLandmarker.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    };
    createRecognizers();

    setCanvasCtx(canvasRef.current?.getContext("2d"));
  }, []);

  const predictWebcam = () => {
    if (!gestureRecognizer.current || !poseLandmarker.current || !canvasCtx)
      return;
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;
    let gestureResults = null;
    let poseResults = null;
    if (video) {
      const startTimeInMs = performance.now();
      gestureResults = gestureRecognizer.current.recognizeForVideo(
        video,
        startTimeInMs
      );
      poseResults = poseLandmarker.current.detectForVideo(video, startTimeInMs);
    }
    canvasCtx?.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
    const drawingUtils = new DrawingUtils(canvasCtx);

    // Drawing pose landmarks
    if (poseResults?.landmarks.length !== 0) {
      let connectorColor = "#408080";
      for (let i = 0; i < poseResults.landmarks.length; i++) {
        let landmarkColor = "#8F4F4F";
        drawingUtils.drawConnectors(
          poseResults.landmarks[i],
          PoseLandmarker.POSE_CONNECTIONS,
          {
            color: connectorColor,
            lineWidth: 3,
          }
        );
        drawingUtils.drawLandmarks(poseResults.landmarks[i], {
          color: landmarkColor,
          lineWidth: 1,
        });
      }
    }

    if (!handDetected && predicting) {
      setHandDetected(gestureResults.landmarks.length !== 0);
    }
    // Drawing hand landmarks
    if (gestureResults.landmarks.length !== 0) {
      let connectorColor = "#808080";
      let landmarkColor = "#4F4F4F";

      // draw landmarks and connectors
      for (let i = 0; i < gestureResults.landmarks.length; i++) {
        const landmarks = gestureResults.landmarks[i];
        const categoryName = gestureResults.gestures[i][0].categoryName;

        // draw detected landmarks to canvas
        drawingUtils.drawConnectors(
          landmarks,
          GestureRecognizer.HAND_CONNECTIONS,
          {
            color: connectorColor,
            lineWidth: 3,
          }
        );
        drawingUtils.drawLandmarks(landmarks, {
          color: landmarkColor,
          lineWidth: 1,
        });
      }
    }
    canvasCtx.restore();

    if (predicting && handDetected && landmarkSequence.length <= frameCount) {
      //Promise.resolve().then(() => {
      //faceLandmarks = holisticResults.faceLandmarks
      //  ? holisticResults.faceLandmarks.flatMap((res) => [res.x, res.y, res.z])
      //  : Array(478 * 3).fill(0);
      let poseLandmarks, leftHandLandmarks, rightHandLandmarks;
      poseLandmarks =
        poseResults?.landmarks.length > 0
          ? poseResults.landmarks[0].flatMap((res) => [res.x, res.y, res.z])
          : Array(33 * 3).fill(0);

      rightHandLandmarks = Array(21 * 3).fill(0);
      leftHandLandmarks = Array(21 * 3).fill(0);
      if (gestureResults?.landmarks.length > 0) {
        for (let i = 0; i < gestureResults.landmarks.length; i++) {
          if (gestureResults.handedness[i][0]?.displayName === "Left") {
            rightHandLandmarks = gestureResults.landmarks[i].flatMap((res) => [
              res.x,
              res.y,
              res.z,
            ]);
          } else if (gestureResults.handedness[i][0]?.displayName === "Right") {
            leftHandLandmarks = gestureResults.landmarks[i].flatMap((res) => [
              res.x,
              res.y,
              res.z,
            ]);
          }
        }
      }
      const newDataSet = [
        ...poseLandmarks,
        ...leftHandLandmarks,
        ...rightHandLandmarks,
      ];
      setSequence([...landmarkSequence, newDataSet]);
      if (landmarkSequence.length === frameCount) {
        continueCollect();
      }
    }
  };
  useEffect(() => {
    const intervalId = setInterval(predictWebcam, intervalDuration);

    return () => clearInterval(intervalId); // Clean up the interval on unmount
  }, [predicting, handDetected, landmarkSequence, cameraActive]);

  return (
    <>
      <div className="video-container">
        <div
          style={{
            position: "absolute",
            display: "flex",
            justifyContent: "space-between",
            top: 0,
            //width: videoWidth,
            width: "100%",
            zIndex: 9,
          }}
        >
          <h3
            style={{
              padding: 0,
              margin: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <div>
              Frame Count:{" "}
              {landmarkSequence.length > frameCount
                ? frameCount
                : landmarkSequence.length}
            </div>
            <div>
              Prediction 1:{" "}
              {result
                ? `${result.prediction1} (${result.score1.toFixed(2)})`
                : ""}
            </div>
            <div>
              Prediction 2:{" "}
              {result
                ? `${result.prediction2} (${result.score2.toFixed(2)})`
                : ""}
            </div>
            <div>
              Prediction 3:{" "}
              {result
                ? `${result.prediction3} (${result.score3.toFixed(2)})`
                : ""}
            </div>
          </h3>
          <div
            className={isSending ? "disabled" : ""}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <button onClick={toggleCollect}>
              {predicting ? "stop predicting" : "start predicting"}
            </button>
            <button onClick={resetBackendQueue}>Reset</button>
          </div>
        </div>
        <div></div>
        <Webcam
          width={videoWidth * 0.8}
          height={videoHeight * 0.8}
          videoConstraints={videoConstraints}
          ref={webcamRef}
          className="webcam"
          mirrored={true}
        />
        <canvas
          width={videoWidth * 0.8}
          height={videoHeight * 0.8}
          ref={canvasRef}
          className="canvas"
        ></canvas>
      </div>
    </>
  );
}

function ModelTesterLite() {
  const [cameraActive, setCameraActive] = useState(false);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  let camera;

  const toggleCamera = () => {
    const video = webcamRef.current?.video;
    if (cameraActive && video) {
      video.srcObject.getTracks().forEach((track) => {
        track.stop();
      });
      video.srcObject = null;
    }
    setCameraActive(!cameraActive);
  };

  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}
    >
      <div
        style={{
          position: "absolute",
          zIndex: 10,
        }}
      >
        <button onClick={toggleCamera}>
          {cameraActive ? "turn off camera" : "turn on camera"}
        </button>
      </div>
      {cameraActive && (
        <VideoCanvas
          webcamRef={webcamRef}
          canvasRef={canvasRef}
          cameraActive={cameraActive}
        />
      )}
    </div>
  );
}

export default ModelTesterLite;
