import React, { useCallback, useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import HandDetectionOverlay from "./HandDetectionOverlay";

export default function WebcamField({ onCapture, disabled }) {
  const webcamRef = useRef(null);
  const frameCollectorRef = useRef(null);
  const frameTimestampsRef = useRef([]);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const RECORDING_DURATION = 3000; // 3 seconds for a more complete sign capture
  const FRAMES_PER_SECOND = 15; // 15 fps for smoother motion capture
  const STABILIZATION_DELAY = 500; // 500ms to let user stabilize after countdown


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

  const startRecording = useCallback(() => {
   // Add stabilization delay
  setTimeout(() => {
    const frames = [];
    frameTimestampsRef.current = [];
    const startTime = Date.now();
    const frameInterval = 1000 / FRAMES_PER_SECOND;
    let lastFrameTime = startTime;


    frameCollectorRef.current = setInterval(() => {
      const currentTime = Date.now();
      const frame = capture();
      
      if (frame) {
        // Only collect frame if we're close to our desired interval
        const timeSinceLastFrame = currentTime - lastFrameTime;
        if (Math.abs(timeSinceLastFrame - frameInterval) < frameInterval * 0.2) {
          frames.push(frame);
          frameTimestampsRef.current.push(currentTime);
          lastFrameTime = currentTime;
        }
      }


      const elapsed = currentTime - startTime;
      const progress = Math.min((elapsed / RECORDING_DURATION) * 100, 100);
      setRecordingProgress(progress);
      if (elapsed >= RECORDING_DURATION) {
        clearInterval(frameCollectorRef.current);
        setIsRecording(false);
        setRecordingProgress(0);
        
        // Calculate actual FPS achieved
        const actualFps = frames.length / (RECORDING_DURATION / 1000);
        console.log(`Recorded ${frames.length} frames at ${actualFps.toFixed(1)} fps`);
        
        // Pass all collected frames to the parent
        onCapture?.(frames);
      }
    }, Math.floor(frameInterval * 0.8)); // Slightly faster interval to account for JS timing inconsistencies
  }, STABILIZATION_DELAY);


  setIsRecording(true);
}, [capture, onCapture]);


const handleTry = async () => {
  setIsCountingDown(true);
  setCountdown(5);
};


const handleCancel = () => {
  setIsCountingDown(false);
  setCountdown(0);
  if (frameCollectorRef.current) {
    clearInterval(frameCollectorRef.current);
    setIsRecording(false);
    setRecordingProgress(0);
  }
};

// Effect to manage countdown
useEffect(() => {
  let timer;
  if (isCountingDown && countdown > 0) {
    timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
  } else if (isCountingDown && countdown === 0) {
    startRecording();
    setIsCountingDown(false);
  }
  return () => clearTimeout(timer);
}, [countdown, isCountingDown, startRecording]);



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
        <div className="button-group">
          <button
            className="primary"
            onClick={handleTry}
            disabled={disabled || !!error || isCountingDown || isRecording}
          >
            {isRecording ? 'Recording...' : isCountingDown ? `Ready in ${countdown}...` : 'Try it'}
          </button>
          {(isCountingDown || isRecording) && (
            <button
              className="secondary cancel-button"
              onClick={handleCancel}
            >
              Cancel
           </button>
          )}
        </div>
        {isRecording && (
         <div className="recording-overlay">
           <div className="recording-indicator"></div>
           <div className="recording-progress">
             <div
               className="progress-bar"
               style={{ width: `${recordingProgress}%` }}
             ></div>
           </div>
         </div>
       )}
      </div>
    </div>
  );
}