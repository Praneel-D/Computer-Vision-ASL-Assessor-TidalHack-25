import React, { useState } from "react";

export default function SignPrompt({ sign }) {
  const [showExample, setShowExample] = useState(false);
  
  if (!sign) return null;
  
  return (
    <div className="sign-prompt">
      <div className="sign-meaning">
        <h2>{sign.word}</h2>
        <p className="muted">{sign.meaning}</p>
        {sign.tips && <p className="tips">Tip: {sign.tips}</p>}
        
        {sign.sampleImage && (
          <button 
            className="example-toggle"
            onClick={() => setShowExample(!showExample)}
            title={showExample ? 'Hide example demonstration' : 'Show example demonstration'}
          >
            <span className="toggle-icon">
              {showExample ? '🙈' : '👁️'}
            </span>
            {showExample ? 'Hide Example' : 'Show Example'}
          </button>
        )}
      </div>
      
      <div className="sign-image-container">
        {showExample && sign.sampleImage ? (
          <div className="sign-image">
            <img 
              src={sign.sampleImage} 
              alt={`${sign.word} example demonstration`}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<div class="error-text">Image failed to load</div>';
              }}
            />
          </div>
        ) : (
          <div className="sign-image placeholder">
            {sign.sampleImage ? (
              <div>
                <div className="placeholder-icon">📖</div>
                <div>Click "Show Example" to see how to perform this sign</div>
              </div>
            ) : (
              <div>
                <div className="placeholder-icon">❓</div>
                <div>No example available</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
