import Webcam from "react-webcam";
import { useRef, useState, useEffect } from "react";
import { GestureRecognizer, DrawingUtils } from "@mediapipe/tasks-vision";
import { FilesetResolver } from "@mediapipe/tasks-text";
import "./ModelStyles.css";

function Demo() {
  /** DECLARE AND/OR INITIALIZE HOOKS */
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectedResults = useRef(null);
  const gestureRecognizer = useRef(null);
  const [frameInvoker, setFrameInvoker] = useState(false);
  const [canvasCtx, setCanvasCtx] = useState(null);
  const [animationFrameId, setAnimationFrameId] = useState(null);
  const [configurationOptions, setConfigurationOptions] = useState({
    baseOptions: {
      modelAssetPath: "assets/alphabet_recognizer.task",
      delegate: "GPU",
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
    detectedResults.current = null;
    if (webcamRef.current && gestureRecognizer.current) {
      const video = webcamRef.current.video;
      const results = gestureRecognizer.current.recognizeForVideo(
        video,
        performance.now()
      );

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, 1280, 720);
      if (results.landmarks?.length !== 0 && canvasRef.current) {
        //console.log("detected label", results.gestures[0][0].categoryName);
        detectedResults.current = {
          label: results.gestures[0][0].categoryName,
          score: results.gestures[0][0].score,
        };

        const drawingUtils = new DrawingUtils(canvasCtx);

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

  window.requestAnimationFrame(predictWebcam);

  return (
    <>
      <h1>
        {detectedResults.current
          ? `${detectedResults.current.label} : ${
              detectedResults.current.score * 100
            }%`
          : "none"}
      </h1>
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

export default Demo;
