import { useEffect, useMemo, useState } from 'react';
import './App.css';
import SignPrompt from './components/SignPrompt';
import WebcamField from './components/WebcamField';
import MatchGauge from './components/MatchGauge';
import FeedbackPanel from './components/FeedbackPanel';
import ConfigStatus from './components/ConfigStatus';
import SignGallery from './components/SignGallery';
import signs from './data/signs';
import { computeMatch, initMatcher } from './utils/matcher';

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchResult, setMatchResult] = useState(null); // full result object
  const [status, setStatus] = useState('Ready');
  const [engine, setEngine] = useState('stub');
  const [showGallery, setShowGallery] = useState(false);
  const currentSign = useMemo(() => signs[currentIndex], [currentIndex]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setStatus('Loading model...');
      const res = await initMatcher();
      if (!mounted) return;
      setEngine(res.engine);
      setStatus(res.ok ? 'Model ready' : 'Model unavailable — using demo scorer');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onCapture = async (dataUrl) => {
    setStatus('Analyzing...');
    setMatchResult(null);
    try {
      const result = await computeMatch(dataUrl, currentSign);
      setMatchResult(result);
      setStatus('Result');
      setEngine(result.engine);
    } catch (error) {
      console.error('Analysis failed:', error);
      setStatus('Analysis failed');
      setMatchResult({
        score: 0,
        engine: 'error',
        details: { error: error.message }
      });
    }
  };

  const nextSign = () => {
    setMatchResult(null);
    setStatus('Ready');
    setCurrentIndex((i) => (i + 1) % signs.length);
  };

  const prevSign = () => {
    setMatchResult(null);
    setStatus('Ready');
    setCurrentIndex((i) => (i - 1 + signs.length) % signs.length);
  };

  return (
    <div className="App">
      <ConfigStatus />
      <header className="App-header">
        <div className="header-content">
          <div>
            <h1>ASL Form Correction</h1>
            <p className="muted">Try the prompted sign on your webcam and see your match percentage.</p>
          </div>
          <button
            className="gallery-button"
            onClick={() => setShowGallery(true)}
            title="View all available signs"
          >
            📚 View All Signs
          </button>
        </div>
      </header>
      <div className="app-container">
        <div className={matchResult?.details?.feedback ? "content-grid-with-feedback" : "content-grid"}>
          <div className="panel">
            <SignPrompt sign={currentSign} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="primary" onClick={prevSign}>Previous</button>
              <button className="primary" onClick={nextSign}>Next</button>
            </div>
          </div>
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <MatchGauge value={matchResult?.score} status={`${status} • engine: ${engine}`} />
            <FeedbackPanel matchResult={matchResult} />
          </div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <WebcamField onCapture={onCapture} disabled={status === 'Analyzing...'} />
        </div>
      </div>

      {showGallery && (
        <SignGallery onClose={() => setShowGallery(false)} />
      )}
    </div>
  );
}

export default App;
