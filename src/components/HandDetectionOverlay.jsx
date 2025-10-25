import React, { useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/handpose';

/**
 * HandDetectionOverlay (TF.js)
 * - Uses @tensorflow-models/hand-pose-detection to detect hands on the webcam video
 * - Draws bounding boxes and keypoints onto a canvas overlay
 */
const HandDetectionOverlay = ({ webcamRef }) => {
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const isEstimatingRef = useRef(false);
  const lastEstimateRef = useRef(0);
  const offscreenRef = useRef(null); // for resized input to detector

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const init = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();

        // load the handpose model (older API)
        detectorRef.current = await handpose.load();

        console.log('[HandDetectionOverlay] TF.js hand detector ready');

        // Start detection loop if video already available
        startDetectionLoop();
      } catch (err) {
        console.error('[HandDetectionOverlay] failed to init TF detector', err);
      }
    };

    init();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        detectorRef.current?.dispose?.();
      } catch (e) {
        // ignore
      }
    };
    // run once
  }, []);

  // Start the loop when both detector and video are available
  const startDetectionLoop = () => {
    const video = webcamRef?.current?.video;
    const canvas = canvasRef.current;
    if (!video || !canvas || !detectorRef.current) return;

    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;
    };

    video.addEventListener('loadedmetadata', resizeCanvas);
    resizeCanvas();

    // Throttle detection to `targetFps` and avoid overlapping async calls.
    const targetFps = 10; // change to 5-15 depending on performance
    const minInterval = 1000 / targetFps;

    // Create offscreen canvas for resizing frames to reduce work
    if (!offscreenRef.current) {
      const off = document.createElement('canvas');
      offscreenRef.current = off;
    }

    const loop = async () => {
      try {
        if (video.readyState === 4) {
          const now = performance.now();
          // skip if we estimated too recently
          if (now - lastEstimateRef.current < minInterval) {
            // still clear any stale drawings to keep overlay responsive
            // but don't call the heavy estimator
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          // avoid overlapping async estimator calls
          if (isEstimatingRef.current) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          isEstimatingRef.current = true;
          lastEstimateRef.current = now;

          // Draw a downscaled frame to the offscreen canvas to reduce model input size
          const off = offscreenRef.current;
          const targetW = 320; // smaller size => faster
          const aspect = video.videoWidth / video.videoHeight || 4/3;
          const targetH = Math.round(targetW / aspect);
          off.width = targetW;
          off.height = targetH;
          const offCtx = off.getContext('2d');
          offCtx.drawImage(video, 0, 0, targetW, targetH);

          // Run estimator on the smaller canvas to reduce compute and memory pressure
          let predictions = null;
          try {
            // handpose accepts image/video/canvas
            predictions = await detectorRef.current.estimateHands(off);
          } finally {
            isEstimatingRef.current = false;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (predictions && predictions.length > 0) {
            predictions.forEach((pred) => {
              // `pred.landmarks` is an array of [x, y, z] relative to the offscreen canvas size
              const keypoints = pred.landmarks.map((pt) => ({ x: pt[0] * (canvas.width / off.width), y: pt[1] * (canvas.height / off.height), z: pt[2] }));

              // draw keypoints
              keypoints.forEach((kp) => {
                ctx.beginPath();
                ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = 'lime';
                ctx.fill();
              });

              // bounding box from landmarks
              const xs = keypoints.map((k) => k.x);
              const ys = keypoints.map((k) => k.y);
              const minX = Math.min(...xs);
              const minY = Math.min(...ys);
              const maxX = Math.max(...xs);
              const maxY = Math.max(...ys);

              const padding = 10;
              ctx.strokeStyle = 'red';
              ctx.lineWidth = 3;
              ctx.strokeRect(minX - padding, minY - padding, (maxX - minX) + padding * 2, (maxY - minY) + padding * 2);

              ctx.fillStyle = 'red';
              ctx.font = 'bold 16px Arial';
              ctx.fillText('Hand', Math.max(0, minX), Math.max(16, minY - 8));
            });
          }
        }
      } catch (err) {
        // non-fatal - log for debugging
        console.error('[HandDetectionOverlay] detection error', err);
        isEstimatingRef.current = false;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    // Start the loop
    loop();

    // cleanup when video or component unmounts
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.removeEventListener('loadedmetadata', resizeCanvas);
    };
  };

  // Kick off detection when the webcam becomes available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Try to start detection (guarded inside startDetectionLoop)
    const tryStart = () => {
      if (detectorRef.current && webcamRef?.current?.video) {
        startDetectionLoop();
      }
    };

    tryStart();

    // Also watch for the video element to be set
    const interval = setInterval(tryStart, 500);
    return () => clearInterval(interval);
  }, [webcamRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};

export default HandDetectionOverlay;