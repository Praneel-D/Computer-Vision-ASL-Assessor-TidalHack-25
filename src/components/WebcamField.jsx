import React, { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";
import HandDetectionOverlay from "./HandDetectionOverlay";

export default function WebcamField({ onCapture, disabled }) {
  const webcamRef = useRef(null);
  const [error, setError] = useState(null);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user",
  };

  const capture = useCallback(() => {
    if (!webcamRef.current) return null;
    const imageSrc = webcamRef.current.getScreenshot();
    return imageSrc;
  }, []);

  const handleTry = async () => {
    const dataUrl = capture();
    if (!dataUrl) return;
    onCapture?.(dataUrl);
  };

  const onUserMediaError = (e) => {
    console.error("Webcam error", e);
    setError(
      "Could not access the camera. Please allow camera permissions and refresh."
    );
  };

  return (
    <div className="webcam-field">
      <div className="webcam-wrapper" style={{ position: 'relative' }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          width={640}
          height={480}
          videoConstraints={videoConstraints}
          onUserMediaError={onUserMediaError}
        />
        <HandDetectionOverlay webcamRef={webcamRef} />
      </div>
      {error && <div className="error">{error}</div>}
      <div className="controls">
        <button
          className="primary"
          onClick={handleTry}
          disabled={disabled || !!error}
        >
          Try it
        </button>
      </div>
    </div>
  );
}
