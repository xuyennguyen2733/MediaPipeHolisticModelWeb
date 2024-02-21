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

function VideoCanvas({
  webcamRef,
  canvasRef,
  trainLabel,
  datasetCount,
  cameraActive,
}) {
  const [tick, setTick] = useState(0);
  const gestureRecognizer = useRef(null);
  const poseLandmarker = useRef(null);
  const [canvasCtx, setCanvasCtx] = useState(null);
  const [videoWidth, setVideoWidth] = useState(1280);
  const [videoHeight, setVideoHeight] = useState(720);
  const [landmarkSequence, setLandmarkSequence] = useState([]);
  const [collecting, setCollecting] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [flashMode, setFlashMode] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [frameCount, setFrameCount] = useState(16);
  const [datapointCount, setDatapoinCount] = useState(100);
  const [intervalDuration, setIntervalDuration] = useState(30);
  const [videoConstraints, setVideoContraints] = useState({
    //width: videoWidth,
    //height: videoHeight,
    aspectRatio: 16 / 9,
  });
  const sendData = async () => {
    try {
      setIsSending(true);
      for (let i = 0; i < frameCount - 1; i++) {
        const nextLandmarks = landmarkSequence[i + 1];
        const currentLandmarks = landmarkSequence[i];
        const response = await fetch("http://127.0.0.1:8000/train", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            array: nextLandmarks.map(
              (nextLandmarkValue, landmarkIndex) =>
                nextLandmarkValue - currentLandmarks[landmarkIndex]
            ),
            label: trainLabel,
            frameNumber: i,
            setNumber: datasetCount.current,
          }),
        });
        if (!response.ok) {
          console.log("api response not OK");
          return false;
        } else {
          console.log("posted training data successfully");
        }
      }
      setIsSending(false);
      datasetCount.current++;
      return true;
    } catch (error) {
      console.error("Error posting data:", error);
    }
  };

  const toggleOnCollect = () => {
    setCollecting(true);
    setLandmarkSequence([]);
    setHandDetected(false);
  };

  const toggleOffCollect = () => {
    setCollecting(false);
    setLandmarkSequence([]);
    setHandDetected(false);
  };

  const toggleFlashMode = () => {
    if (flashMode) {
      toggleOffCollect();
    } else {
      toggleOnCollect();
    }
    setFlashMode(!flashMode);
  };

  const collectInFlashMode = async () => {
    const succeeded = await sendData();
    if (succeeded) {
      if (datasetCount.current < datapointCount) {
        toggleOnCollect();
      } else {
        toggleFlashMode();
      }
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
      let landmarkColor = "#8F4F4F";
      for (let i = 0; i < poseResults.landmarks.length; i++) {
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

    if (!handDetected && collecting) {
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

    if (
      collecting &&
      (gestureResults || poseResults) &&
      handDetected &&
      landmarkSequence.length <= frameCount
    ) {
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
      setLandmarkSequence([...landmarkSequence, newDataSet]);
      if (landmarkSequence.length === frameCount) {
        if (flashMode) {
          collectInFlashMode();
        }
      }
      //});
    }
  };
  useEffect(() => {
    const intervalId = setInterval(predictWebcam, intervalDuration);

    return () => clearInterval(intervalId); // Clean up the interval on unmount
  }, [collecting, handDetected, landmarkSequence, flashMode, cameraActive]);

  return (
    <>
      <div
        style={{
          position: "absolute",
          display: "flex",
          justifyContent: "space-between",
          width: videoWidth,
          zIndex: 9,
        }}
      >
        <h3 style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div>Training for sign: {trainLabel}</div>
          <div>Number Dataset Sent: {datasetCount.current}</div>
          <div>
            Frame Count:{" "}
            {landmarkSequence.length > frameCount
              ? frameCount
              : landmarkSequence.length}
          </div>
        </h3>
        <div
          className={isSending ? "disabled" : ""}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <button id="send-data-btn" onClick={sendData} disabled={flashMode}>
            send
          </button>
          <button disabled={flashMode} onClick={toggleOnCollect}>
            {collecting ? "restart collect data" : "collect data"}
          </button>
          <button onClick={toggleFlashMode}>
            {flashMode ? "turn off flash mode" : "turn on flash mode"}
          </button>
        </div>
      </div>
      <div></div>
      <div className="video-container">
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

function ModelTrainerLite() {
  const [cameraActive, setCameraActive] = useState(false);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [trainLabel, setTrainLabel] = useState(null);
  const datasetCount = useRef(0);
  let camera;

  const toggleCamera = () => {
    if (trainLabel) {
      const video = webcamRef.current?.video;
      if (cameraActive && video) {
        video.srcObject.getTracks().forEach((track) => {
          track.stop();
        });
        video.srcObject = null;
      }
      setCameraActive(!cameraActive);
    } else {
      window.alert("Please enter what sign you want to train for");
    }
  };

  const onSubmitLabel = (e) => {
    e.preventDefault();
    const form = e.target;
    const label = new FormData(form).get("label");
    setTrainLabel(label.toLocaleLowerCase());
    form.reset();
    datasetCount.current = 0;
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
        <form onSubmit={onSubmitLabel}>
          <input name="label" type="text" placeholder="label" />
          <button>Set Label</button>
        </form>
        <button onClick={toggleCamera}>
          {cameraActive ? "turn off camera" : "turn on camera"}
        </button>
      </div>
      {cameraActive && (
        <VideoCanvas
          webcamRef={webcamRef}
          canvasRef={canvasRef}
          trainLabel={trainLabel}
          datasetCount={datasetCount}
          cameraActive={cameraActive}
        />
      )}
    </div>
  );
}

export default ModelTrainerLite;
