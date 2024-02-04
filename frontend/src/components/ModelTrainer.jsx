import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera } from "@mediapipe/camera_utils";
import {
  FACEMESH_TESSELATION,
  POSE_CONNECTIONS,
  HAND_CONNECTIONS,
  Holistic,
} from "@mediapipe/holistic";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import "../App.css";

function VideoCanvas({ webcamRef, canvasRef, camera }) {
  const videoWidth = 1280;
  const videoHeight = 720;
  const [holisticResults, setHolisticResults] = useState({ faceLandmarks: [] });

  const videoConstraints = {
    //width: videoWidth,
    //height: videoHeight,
    //aspectRatio: 16 / 9,
  };

  const onResults = (results) => {
    if (!webcamRef.current?.video || !canvasRef.current) return;

    setHolisticResults(results);

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");

    if (!canvasCtx) throw new Error("Could not get context");

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = "source-in";
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = "destination-atop";
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

    canvasCtx.globalCompositeOperation = "source-over";

    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
      color: "lightgrey",
      lineWidth: 1,
    });

    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "yellowgreen",
      lineWidth: 4,
    });

    drawLandmarks(canvasCtx, results.poseLandmarks, {
      color: "red",
      lineWidth: 2,
    });

    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
      color: "turquoise",
      lineWidth: 5,
    });

    drawLandmarks(canvasCtx, results.leftHandLandmarks, {
      color: "orange",
      lineWidth: 2,
    });

    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
      color: "turquoise",
      lineWidth: 5,
    });

    drawLandmarks(canvasCtx, results.rightHandLandmarks, {
      color: "orange",
      lineWidth: 2,
    });

    canvasCtx.restore();
  };

  useEffect(() => {
    const holistic = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
      },
    });

    holistic.setOptions({
      selfieMode: true,
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: true,
      smoothSegmentation: true,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    holistic.onResults(onResults);

    if (webcamRef.current?.video) {
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current?.video) {
            await holistic.send({ image: webcamRef.current.video });
          }
        },
        width: 1280,
        height: 720,
      });

      camera.start();
    }
  }, []);

  console.log(holisticResults);

  return (
    <>
      {/*<div>{Object.values(holisticResults?.faceLandmarks).flat()}</div>*/}
      <div style={{ postion: "relative" }}>
        <Webcam
          className="stream"
          ref={webcamRef}
          mirrored={true}
          videoConstraints={videoConstraints}
        />
        <canvas className="stream" ref={canvasRef} width={1280} height={720} />
      </div>
    </>
  );
}

function ModelTrainer() {
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
    <>
      <h1>Train</h1>
      <button onClick={toggleCamera}>
        {cameraActive ? "turn off camera" : "turn on camera"}
      </button>
      {cameraActive && (
        <VideoCanvas
          webcamRef={webcamRef}
          canvasRef={canvasRef}
          camera={camera}
        />
      )}
    </>
  );
}

export default ModelTrainer;
