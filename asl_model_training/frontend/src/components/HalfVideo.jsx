import Webcam from "react-webcam";
import { useRef, useState, useEffect } from "react";
import { GestureRecognizer, DrawingUtils } from "@mediapipe/tasks-vision";
import { FilesetResolver } from "@mediapipe/tasks-text";

function HalfVideo() {
  const webcamRef = useRef();
  const canvasRef = useRef();
  const [frameInvoker, setFrameInvoker] = useState(false);
  const [canvasCtx, setCanvasCtx] = useState(null);
  const [imageDataURL, setImageDataURL] = useState("");
  const gestureRecognizer = useRef(null);
  const [configurationOptions, setConfigurationOptions] = useState({
    baseOptions: {
      modelAssetPath: "/assets/alphabet_recognizer.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
  const createGestureRecognizerForImage = async () => {
    // Create task for image file processing:
    const vision = await FilesetResolver.forVisionTasks(
      // path/to/wasm/root
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    gestureRecognizer.current = await GestureRecognizer.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task",
          delegate: "GPU",
        },
        numHands: 2,
        runningMode: "IMAGE",
      }
    );
  };
  const createGestureRecognizerForVideo = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    gestureRecognizer.current = await GestureRecognizer.createFromOptions(
      vision,
      configurationOptions
    );
  };
  const drawHalfVideo = () => {
    if (
      webcamRef?.current?.video &&
      canvasRef?.current &&
      canvasCtx &&
      gestureRecognizer.current
    ) {
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      canvas.width = videoWidth / 2;
      canvas.height = videoHeight;
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      canvasCtx.translate(canvas.width, 0);
      canvasCtx.scale(-1, 1);

      // TO DO: draw half the video onto the canvas
      canvasCtx.drawImage(
        video, // Source video
        0, // Source x coordinate
        0, // Source y coordinate
        videoWidth / 2, // Source width (half of the video width)
        videoHeight, // Source height
        0, // Destination x coordinate
        0, // Destination y coordinate
        canvas.width, // Destination width (half of the canvas width)
        canvas.height // Destination height
      );

      // Convert canvas content to data URL
      setImageDataURL(canvas.toDataURL("image/jpeg"));
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = imageDataURL;
      if (image.width > 0 && image.height) {
        const results = gestureRecognizer?.current?.recognize(image);
        const drawingUtils = new DrawingUtils(canvasCtx);
        for (const landmarks of results.landmarks) {
          drawingUtils.drawConnectors(
            landmarks,
            GestureRecognizer.HAND_CONNECTIONS,
            {
              color: "#00FF00",
              lineWidth: 5,
            }
          );
          drawingUtils.drawLandmarks(landmarks, {
            color: "#FF0000",
            lineWidth: 1,
          });
        }
      }

      canvasCtx.restore();
    }
    setFrameInvoker(!frameInvoker);
  };
  useEffect(() => {
    createGestureRecognizerForImage();
    //createGestureRecognizerForVideo();
    setCanvasCtx(canvasRef.current?.getContext("2d"));
  }, [canvasRef.current]);

  window.requestAnimationFrame(drawHalfVideo);

  return (
    <div>
      <Webcam
        ref={webcamRef}
        mirrored={true}
        videoConstraints={{ aspectRatio: 16 / 9, width: 1280, height: 720 }}
      />
      <canvas
        ref={canvasRef}
        width={1280 / 4}
        height={720 / 2}
        style={{ zIndex: 2, width: 1280 / 2, height: 720 }}
      ></canvas>
    </div>
  );
}
export default HalfVideo;
