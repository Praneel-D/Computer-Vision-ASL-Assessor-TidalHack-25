import React from 'react';

const FeedbackPanel = ({ matchResult }) => {
    if (!matchResult || !matchResult.details) {
        return null;
    }

    const { details, engine } = matchResult;

    // Enhanced feedback for Bedrock results
    if (engine.includes('bedrock') && details.feedback) {
        return (
            <div className="feedback-panel">
                <h3>AI Analysis</h3>
                <div className="feedback-content">
                    <div className="feedback-section">
                        <h4>Overall Feedback</h4>
                        <p>{details.feedback}</p>
                    </div>

                    {details.suggestions && (
                        <div className="feedback-section">
                            <h4>Suggestions for Improvement</h4>
                            <p>{details.suggestions}</p>
                        </div>
                    )}

                    {details.formAnalysis && (
                        <div className="feedback-section">
                            <h4>Form Analysis</h4>
                            <div className="form-details">
                                {details.formAnalysis.handPosition && (
                                    <div>
                                        <strong>Hand Position:</strong> {details.formAnalysis.handPosition}
                                    </div>
                                )}
                                {details.formAnalysis.fingerPlacement && (
                                    <div>
                                        <strong>Finger Placement:</strong> {details.formAnalysis.fingerPlacement}
                                    </div>
                                )}
                                {details.formAnalysis.overallForm && (
                                    <div>
                                        <strong>Overall Form:</strong> {details.formAnalysis.overallForm}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Basic feedback for MediaPipe/stub results
    return (
        <div className="feedback-panel">
            <h3>Analysis Results</h3>
            <div className="feedback-content">
                {details.reason === 'no-hand' && (
                    <p>No hand detected in the image. Please ensure your hand is visible in the camera.</p>
                )}
                {details.reason === 'no-model' && (
                    <p>Using demo mode. Connect to AWS Bedrock for detailed analysis.</p>
                )}
                {details.open !== undefined && (
                    <div>
                        <p>Hand openness detected: {Math.round(details.open * 100)}%</p>
                        <p>Expected: {details.expectedOpen ? 'Open hand' : 'Closed hand'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackPanel;