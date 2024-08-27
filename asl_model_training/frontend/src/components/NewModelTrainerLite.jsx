import { useState } from "react";
import Webcam from "react-webcam";
import {
  HandLandmarker,
  PoseLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { FilesetResolver } from "@mediapipe/tasks-text";
import { useEffect } from "react";
import { useRef } from "react";

function NewModelTrainerLite() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasCtx, setCanvasCtx] = useState(null);
  const [recording, setRecording] = useState(false);
  const [frameInvoker, setFrameInvoker] = useState(false);
  const [animationFrameId, setAnimationFrameId] = useState(null);
  const videoWidth = 1280;
  const videoHeight = 720;
  const handLandmarker = useRef(null);

  /** INITIALIZE FUNCTIONS */
  const createLandmarkers = async () => {
    const configurationOptions = {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    };
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    handLandmarker.current = await HandLandmarker.createFromOptions(
      vision,
      configurationOptions
    );
  };

  const predictWebcam = () => {
    setFrameInvoker(!frameInvoker);
    if (
      !(
        webcamRef.current &&
        canvasRef.current &&
        canvasCtx &&
        handLandmarker.current
      )
    )
      return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    let handResults = null;
    let poseResults = null;

    if (video) {
      const startTimeInMs = performance.now();
      handResults = handLandmarker.current.detectForVideo(video, startTimeInMs);
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

    const drawingUtils = new DrawingUtils(canvasCtx);

    // Drawing hand landmarks
    if (handResults?.landmarks.length > 0) {
      let connectorColor = "#408080";
      let landmarkColor = "#8F4F4F";

      for (let i = 0; i < handResults.landmarks.length; i++) {
        drawingUtils.drawLandmarks(handResults.landmarks[i], {
          lineWidth: 3,
          color: landmarkColor,
        });
      }
      canvasCtx.restore();
    }

    window.cancelAnimationFrame(animationFrameId);
    setAnimationFrameId(window.requestAnimationFrame(predictWebcam));
  };

  useEffect(() => {}, []);

  useEffect(() => {
    createLandmarkers();
    setAnimationFrameId(window.requestAnimationFrame(predictWebcam));
    setCanvasCtx(canvasRef.current?.getContext("2d"));
  }, [handLandmarker.current, canvasRef.current]);

  const handleRecordButtonClick = () => {
    setRecording(!recording);
  };

  return (
    <div>
      <div>
        <button onClick={handleRecordButtonClick}>
          {recording ? "record" : "end"}
        </button>
      </div>
      <Webcam
        ref={webcamRef}
        width={videoWidth}
        videoConstraints={{ aspectRatio: 16 / 9 }}
      />
      <canvas ref={canvasRef} width={videoWidth} height={videoHeight}></canvas>
    </div>
  );
}

export default NewModelTrainerLite;
