import React, { useState } from 'react';
import signs from '../data/signs';

const SignGallery = ({ onClose }) => {
    const [selectedSign, setSelectedSign] = useState(null);

    return (
        <div className="sign-gallery-overlay">
            <div className="sign-gallery">
                <div className="gallery-header">
                    <h2>ASL Sign Gallery</h2>
                    <button className="close-button" onClick={onClose}>✕</button>
                </div>

                <div className="gallery-grid">
                    {signs.map((sign) => (
                        <div
                            key={sign.id}
                            className={`gallery-item ${selectedSign?.id === sign.id ? 'selected' : ''}`}
                            onClick={() => setSelectedSign(selectedSign?.id === sign.id ? null : sign)}
                        >
                            <div className="gallery-image">
                                {sign.sampleImage ? (
                                    <img src={sign.sampleImage} alt={`${sign.word} example`} />
                                ) : (
                                    <div className="no-image">No image</div>
                                )}
                            </div>
                            <div className="gallery-info">
                                <h3>{sign.word}</h3>
                                <p>{sign.meaning}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {selectedSign && (
                    <div className="selected-sign-details">
                        <h3>{selectedSign.word}</h3>
                        <p><strong>Meaning:</strong> {selectedSign.meaning}</p>
                        <p><strong>Tips:</strong> {selectedSign.tips}</p>
                        <p><strong>Hand Type:</strong> {selectedSign.expectedOpenHand ? 'Open hand' : 'Closed hand/fist'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignGallery;