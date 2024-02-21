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

function VideoCanvas({
  webcamRef,
  canvasRef,
  camera,
  trainLabel,
  datasetCount,
}) {
  const videoWidth = 1280;
  const videoHeight = 720;
  const [holisticResults, setHolisticResults] = useState(null);
  const sequence = useRef([]);
  const collecting = useRef(false);
  const handDetected = useRef(false);
  const flashMode = useRef(false);
  const [isSending, setIsSending] = useState(false);
  const datasetCap = 30;

  const videoConstraints = {
    width: videoWidth,
    height: videoHeight,
    aspectRatio: 16 / 9,
  };

  const sendData = async () => {
    try {
      setIsSending(true);
      for (let i = 0; i < 30; i++) {
        const response = await fetch("http://127.0.0.1:8000/train", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            array: sequence.current[i],
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
    collecting.current = true;
    sequence.current = [];
    handDetected.current = false;
  };

  const toggleOffCollect = () => {
    collecting.current = false;
    sequence.current = [];
    handDetected.current = false;
  };

  const toggleFlashMode = () => {
    if (flashMode.current) {
      toggleOffCollect();
    } else {
      toggleOnCollect();
    }
    flashMode.current = !flashMode.current;
  };

  const collectInFlashMode = async () => {
    const succeeded = await sendData();
    if (succeeded) {
      if (datasetCount.current < datasetCap) {
        toggleOnCollect();
      } else {
        toggleFlashMode();
      }
    }
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

    //drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
    //  color: "lightgrey",
    //  lineWidth: 1,
    //});

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

  let faceLandmarks, poseLandmarks, leftHandLandmarks, rightHandLandmarks;

  if (!handDetected.current && collecting.current) {
    handDetected.current =
      holisticResults.leftHandLandmarks || holisticResults.rightHandLandmarks;
  }

  if (
    collecting.current &&
    holisticResults &&
    handDetected.current &&
    sequence.current.length < 30
  ) {
    Promise.resolve().then(() => {
      //faceLandmarks = holisticResults.faceLandmarks
      //  ? holisticResults.faceLandmarks.flatMap((res) => [res.x, res.y, res.z])
      //  : Array(478 * 3).fill(0);
      poseLandmarks = holisticResults.poseLandmarks
        ? holisticResults.poseLandmarks.flatMap((res) => [
            res.x,
            res.y,
            res.z,
            res.visibility,
          ])
        : Array(33 * 4).fill(0);
      leftHandLandmarks = holisticResults.leftHandLandmarks
        ? holisticResults.leftHandLandmarks.flatMap((res) => [
            res.x,
            res.y,
            res.z,
          ])
        : Array(21 * 3).fill(0);
      rightHandLandmarks = holisticResults.rightHandLandmarks
        ? holisticResults.rightHandLandmarks.flatMap((res) => [
            res.x,
            res.y,
            res.z,
          ])
        : Array(21 * 3).fill(0);
      const newDataSet = [
        ...poseLandmarks,
        //...faceLandmarks,
        ...leftHandLandmarks,
        ...rightHandLandmarks,
      ];
      sequence.current = [...sequence.current, newDataSet];
      if (sequence.current.length == 30) {
        if (flashMode.current) {
          collectInFlashMode();
        }
      }
    });
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          display: "flex",
          justifyContent: "space-between",
          width: videoWidth,
        }}
      >
        <h3>
          <div>Training for sign: {trainLabel}</div>
          <div>Number Dataset Sent: {datasetCount.current}</div>
          <div>Frame Count: {sequence.current.length}</div>
        </h3>
        <div
          className={isSending ? "disabled" : ""}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <button
            id="send-data-btn"
            onClick={sendData}
            disabled={flashMode.current}
          >
            send
          </button>
          <button disabled={flashMode.current} onClick={toggleOnCollect}>
            {collecting.current ? "restart collect data" : "collect data"}
          </button>
          <button onClick={toggleFlashMode}>
            {flashMode.current ? "turn off flash mode" : "turn on flash mode"}
          </button>
        </div>
      </div>
      <div>
        <Webcam
          className="stream"
          ref={webcamRef}
          mirrored={true}
          videoConstraints={videoConstraints}
          style={{ display: "none" }}
        />
        <canvas
          className="stream"
          ref={canvasRef}
          width={videoWidth}
          height={videoHeight}
        />
      </div>
    </>
  );
}

function ModelTrainer() {
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
          camera={camera}
          trainLabel={trainLabel}
          datasetCount={datasetCount}
        />
      )}
    </div>
  );
}

export default ModelTrainer;
