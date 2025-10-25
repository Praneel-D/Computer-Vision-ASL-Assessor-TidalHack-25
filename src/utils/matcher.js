// Enhanced matcher utilities. Tries ML model first, then AWS Bedrock for advanced sign analysis,
// falls back to MediaPipe Hand Landmarker, or finally to a stubbed score.

import mlModelService from '../services/mlModelService';
import bedrockService from '../services/bedrockService';
import bedrockServiceDev from '../services/bedrockServiceDev';

let handLandmarker = null;
let filesetResolver = null;
let bedrockAvailable = false;
let mlModelAvailable = false;

const MP_TASKS_VERSION = '0.10.14';
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_TASKS_VERSION}/wasm`;
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task';

export async function initMatcher() {
  let primaryEngine = 'stub';
  let engineStatus = { ok: false };

  // Try to initialize ML Model first (if enabled)
  if (process.env.REACT_APP_USE_ML_MODEL !== 'false') {
    try {
      mlModelAvailable = await mlModelService.initialize();
      if (mlModelAvailable) {
        primaryEngine = 'ml-model';
        engineStatus = { ok: true };
      }
    } catch (e) {
      console.warn('ML Model not available:', e);
      mlModelAvailable = false;
    }
  }

  // Try to initialize Bedrock if ML model failed (if enabled)
  if (!mlModelAvailable && process.env.REACT_APP_USE_BEDROCK === 'true') {
    try {
      // Try development proxy first in development mode
      if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_DEV_PROXY === 'true') {
        bedrockAvailable = await bedrockServiceDev.initialize();
        if (bedrockAvailable) {
          primaryEngine = 'bedrock-dev';
          engineStatus = { ok: true };
        }
      } else {
        bedrockAvailable = await bedrockService.initialize();
        if (bedrockAvailable) {
          primaryEngine = 'bedrock';
          engineStatus = { ok: true };
        }
      }
    } catch (e) {
      console.warn('Bedrock not available:', e);
      bedrockAvailable = false;
    }
  }

  // Try MediaPipe as fallback (if ML model and Bedrock failed or fallback enabled)
  if ((!mlModelAvailable && !bedrockAvailable) || process.env.REACT_APP_FALLBACK_TO_MEDIAPIPE === 'true') {
    try {
      const mod = await import('@mediapipe/tasks-vision');
      const { HandLandmarker, FilesetResolver } = mod;
      filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE);
      handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_URL,
        },
        numHands: 1,
        runningMode: 'IMAGE',
      });

      if (!mlModelAvailable && !bedrockAvailable) {
        primaryEngine = 'mediapipe';
        engineStatus = { ok: true };
      }
    } catch (e) {
      console.warn('MediaPipe not available:', e);
      handLandmarker = null;
      filesetResolver = null;
      if (!mlModelAvailable && !bedrockAvailable) {
        engineStatus = { ok: false };
      }
    }
  }

  return { ...engineStatus, engine: primaryEngine };
}

function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// Simple heuristic for open hand: average fingertip distance from wrist.
function openHandHeuristic(landmarks) {
  // Landmark indices based on MediaPipe Hands
  const WRIST = 0;
  const TIPS = [4, 8, 12, 16, 20];
  const wrist = landmarks[WRIST];
  const avgTipDist =
    TIPS.map((i) => distance(landmarks[i], wrist)).reduce((a, b) => a + b, 0) / TIPS.length;
  // Normalize by diagonal of [0,1] space (~sqrt(2)) and scale
  const normalized = Math.min(1, avgTipDist / 0.6);
  return normalized; // 0..1
}

export async function computeMatch(dataUrl, targetSign) {
  // Try ML Model first if available
  if (mlModelAvailable) {
    try {
      const result = await mlModelService.analyzeSignLanguage(dataUrl, targetSign);
      return result;
    } catch (e) {
      console.warn('ML Model analysis failed, falling back to Bedrock:', e);
      // Continue to Bedrock fallback
    }
  }

  // Try Bedrock if ML model failed
  if (bedrockAvailable) {
    try {
      const service = (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_DEV_PROXY === 'true')
        ? bedrockServiceDev
        : bedrockService;
      const result = await service.analyzeSignLanguage(dataUrl, targetSign);
      return result;
    } catch (e) {
      console.warn('Bedrock analysis failed, falling back to MediaPipe:', e);
      // Continue to MediaPipe fallback
    }
  }

  // MediaPipe fallback
  if (handLandmarker) {
    try {
      const img = await dataUrlToImage(dataUrl);
      const result = handLandmarker.detect(img);
      const hands = result?.landmarks ?? [];
      if (!hands.length) {
        return { score: 5, engine: 'mediapipe', details: { reason: 'no-hand' } };
      }
      const lm = hands[0];
      const open = openHandHeuristic(lm); // 0..1
      const expectedOpen = !!targetSign?.expectedOpenHand;
      // Map heuristic to a percentage with a small penalty if expectation mismatches
      let pct = Math.round(open * 100);
      if (expectedOpen) {
        // favor higher when open expected
        pct = Math.round(50 + open * 50);
      } else {
        // favor higher when closed expected
        pct = Math.round(100 - open * 70);
      }
      pct = Math.max(1, Math.min(99, pct));
      return { score: pct, engine: 'mediapipe', details: { open, expectedOpen } };
    } catch (e) {
      console.error('MediaPipe computeMatch error', e);
      // Fall through to stub
    }
  }

  // Final fallback: stub scorer
  const base = targetSign?.expectedOpenHand ? 70 : 65;
  const jitter = Math.floor(Math.random() * 20) - 10; // +/- 10
  const score = Math.max(5, Math.min(99, base + jitter));
  return { score, engine: 'stub', details: { reason: 'no-model' } };
}
