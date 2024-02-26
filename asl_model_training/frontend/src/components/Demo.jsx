import Webcam from "react-webcam";
import { useRef, useState, useEffect } from "react";
import { GestureRecognizer, DrawingUtils } from "@mediapipe/tasks-vision";
import { FilesetResolver } from "@mediapipe/tasks-text";
import "./ModelStyles.css";

function Demo() {
  /** DECLARE AND/OR INITIALIZE HOOKS */
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const gestureRecognizer = useRef(null);
  const [frameInvoker, setFrameInvoker] = useState(false);
  const [canvasCtx, setCanvasCtx] = useState(null);
  const [configurationOptions, setConfigurationOptions] = useState({
    baseOptions: {
      modelAssetPath: "assets/alphabet_recognizer.task",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });

  /** INITIALIZE FUNCTIONS */
  const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    gestureRecognizer.current = await GestureRecognizer.createFromOptions(
      vision,
      configurationOptions
    );
  };

  const recognizeHands = () => {
    if (webcamRef.current && gestureRecognizer.current) {
      const video = webcamRef.current.video;
      const results = gestureRecognizer.current.recognizeForVideo(
        video,
        performance.now()
      );

      if (results.landmarks?.length !== 0 && canvasRef.current) {
        const drawingUtils = new DrawingUtils(canvasCtx);

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, 1280, 720);

        for (let i = 0; i < results.landmarks.length; i++) {
          drawingUtils.drawLandmarks(results.landmarks[i], {
            lineWidth: 3,
            color: "red",
          });

          drawingUtils.drawConnectors(
            results.landmarks[i],
            GestureRecognizer.HAND_CONNECTIONS,
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
  };

  /** IMPLEMENT FUNCTIONALITIES */
  useEffect(() => {
    createGestureRecognizer();
    setCanvasCtx(canvasRef.current?.getContext("2d"));
  }, []);

  window.requestAnimationFrame(recognizeHands);

  return (
    <div className="video-container">
      <Webcam
        mirrored={true}
        ref={webcamRef}
        videoConstraints={{ aspectRatio: 16 / 9 }}
        width={1280}
        height={720}
      />
      <canvas
        className="canvas"
        width={1280}
        height={720}
        ref={canvasRef}
      ></canvas>
    </div>
  );
}

export default Demo;
