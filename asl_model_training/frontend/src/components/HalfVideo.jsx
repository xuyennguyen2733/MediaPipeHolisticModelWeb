import Webcam from "react-webcam";
import { useRef, useState, useEffect } from "react";
import { HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { FilesetResolver } from "@mediapipe/tasks-text";
import { PiRecordFill } from "react-icons/pi";
import "./ModelStyles.css";

const fingerLookupIndices = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
};

function HalfVideo() {
  /** DECLARE AND/OR INITIALIZE HOOKS */
  const [recordColor, setRecordColor] = useState("grey");
  const [animationFrameId, setAnimationFrameId] = useState(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectedResults = useRef(null);
  const handLandmarker = useRef(null);
  const [frameInvoker, setFrameInvoker] = useState(false);
  const [canvasCtx, setCanvasCtx] = useState(null);
  const [configurationOptions, setConfigurationOptions] = useState({
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });

  /** INITIALIZE FUNCTIONS */
  const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    handLandmarker.current = await HandLandmarker.createFromOptions(
      vision,
      configurationOptions
    );
  };

  const detectHands = () => {
    detectedResults.current = null;
    if (webcamRef.current && handLandmarker.current) {
      const video = webcamRef.current.video;
      const results = handLandmarker.current.detectForVideo(
        video,
        performance.now()
      );

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, 1280, 720);
      if (results.landmarks?.length !== 0 && canvasRef.current) {
        console.log("hand connectors", HandLandmarker.HAND_CONNECTIONS[0]);

        const drawingUtils = new DrawingUtils(canvasCtx);

        for (let i = 0; i < results.landmarks.length; i++) {
          drawingUtils.drawLandmarks(results.landmarks[i], {
            lineWidth: 3,
            color: "red",
          });

          drawingUtils.drawConnectors(
            results.landmarks[i],
            HandLandmarker.HAND_CONNECTIONS,
            {
              lineWidth: 1,
              color: "green",
            }
          );
        }

        canvasCtx.restore();
      }
    }
    setFrameInvoker(!frameInvoker);
    window.cancelAnimationFrame(animationFrameId);
    setAnimationFrameId(window.requestAnimationFrame(detectHands));
  };

  const handleStartRecording = (event) => {
    if (event.key === "Enter") {
      setRecordColor("red");
    }
  };

  const handleStopRecording = (event) => {
    if (event.key === "Enter") {
      setRecordColor("grey");
    }
  };

  /** IMPLEMENT FUNCTIONALITIES */
  useEffect(() => {
    if (!handLandmarker.current) createHandLandmarker();
    setCanvasCtx(canvasRef.current?.getContext("2d"));
    setAnimationFrameId(window.requestAnimationFrame(detectHands));
  }, [handLandmarker.current]);
  useEffect(() => {
    window.addEventListener("keydown", handleStartRecording);
    window.addEventListener("keyup", handleStopRecording);
  }, []);

  return (
    <>
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <PiRecordFill
          style={{ width: "5rem", height: "5rem", color: recordColor }}
        />
      </div>
      <div className="video-container">
        <Webcam
          muted={false}
          mirrored={true}
          ref={webcamRef}
          videoConstraints={{ aspectRatio: 16 / 9 }}
          width={1280 * 0.8}
          height={720 * 0.8}
        />
        <canvas
          className="canvas"
          width={1280 * 0.8}
          height={720 * 0.8}
          ref={canvasRef}
        ></canvas>
      </div>
    </>
  );
}

export default HalfVideo;
