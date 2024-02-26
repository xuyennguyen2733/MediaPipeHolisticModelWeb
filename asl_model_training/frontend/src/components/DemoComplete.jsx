import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { FilesetResolver } from "@mediapipe/tasks-vision";
import "./ModelStyles.css";

function Demo() {
  /** DECLARE AND/OR INITIALIZE HOOKS */
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const handLandmarker = useRef(null);
  const [videoConstraints, setVideoContraints] = useState({
    aspectRatio: 16 / 9,
  });
  const [frameInvoker, setFrameInvoker] = useState(false);
  const [canvasCtx, setCanvasCtx] = useState(null);

  /** INITIALIZE FUNCTIONS */

  const detectHands = () => {
    if (webcamRef.current && handLandmarker.current) {
      const video = webcamRef.current.video;
      const results = handLandmarker.current.detectForVideo(
        video,
        performance.now()
      );
      canvasCtx?.save();
      canvasCtx.clearRect(0, 0, 1280, 720); // x coord of top left corner, y coord of top left corner, canvas width, canvas height
      const drawingUtils = new DrawingUtils(canvasCtx);

      if (results?.landmarks.length !== 0) {
        for (let i = 0; i < results.landmarks.length; i++) {
          // draw connectors
          drawingUtils.drawConnectors(
            results.landmarks[i],
            HandLandmarker.HAND_CONNECTIONS,
            {
              color: "green",
              lineWidth: 3,
            }
          );

          // draw joints
          drawingUtils.drawLandmarks(results.landmarks[i], {
            color: "red",
            lineWidth: 1,
          });
        }
      }
    }
    setFrameInvoker(!frameInvoker);
  };

  /** IMPLEMENT FUNCTIONALITIES */
  useEffect(() => {
    const createHandLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      const configurationOptions = {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        runningMode: "VIDEO",
        numHands: 2,
      };

      handLandmarker.current = await HandLandmarker.createFromOptions(
        vision,
        configurationOptions
      );
    };
    createHandLandmarker();
    setCanvasCtx(canvasRef.current?.getContext("2d"));
  }, []);

  window.requestAnimationFrame(detectHands);

  //});

  return (
    <div className="video-container">
      <Webcam
        ref={webcamRef}
        width={1280}
        height={720}
        videoConstraints={videoConstraints}
        mirrored={true}
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
