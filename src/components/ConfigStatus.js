import React, { useState, useEffect } from 'react';
import bedrockService from '../services/bedrockService';
import mlModelService from '../services/mlModelService';

const ConfigStatus = () => {
    const [status, setStatus] = useState({
        mlModel: 'checking',
        bedrock: 'checking',
        mediapipe: 'checking',
        config: 'checking'
    });

    useEffect(() => {
        checkConfiguration();
    }, []);

    const checkConfiguration = async () => {
        // Check ML Model availability
        let mlModelStatus = 'disabled';
        if (process.env.REACT_APP_USE_ML_MODEL !== 'false') {
            try {
                const initialized = await mlModelService.initialize();
                mlModelStatus = initialized ? 'available' : 'error';
            } catch (error) {
                mlModelStatus = 'error';
            }
        }

        // Check environment variables
        const hasBedrockConfig = !!(
            process.env.REACT_APP_AWS_REGION &&
            process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID
        );

        // Check Bedrock availability
        let bedrockStatus = 'disabled';
        if (process.env.REACT_APP_USE_BEDROCK === 'true') {
            if (hasBedrockConfig) {
                try {
                    const initialized = await bedrockService.initialize();
                    bedrockStatus = initialized ? 'available' : 'error';
                } catch (error) {
                    bedrockStatus = 'error';
                }
            } else {
                bedrockStatus = 'misconfigured';
            }
        }

        // Check MediaPipe
        let mediapipeStatus = 'available';
        try {
            await import('@mediapipe/tasks-vision');
        } catch (error) {
            mediapipeStatus = 'unavailable';
        }

        setStatus({
            mlModel: mlModelStatus,
            bedrock: bedrockStatus,
            mediapipe: mediapipeStatus,
            config: hasBedrockConfig ? 'configured' : 'missing'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'available':
            case 'configured':
                return '#10b981'; // green
            case 'disabled':
                return '#6b7280'; // gray
            case 'error':
            case 'misconfigured':
            case 'unavailable':
            case 'missing':
                return '#ef4444'; // red
            default:
                return '#f59e0b'; // yellow
        }
    };

    const getStatusText = (key, status) => {
        const texts = {
            mlModel: {
                available: 'ML Model Ready',
                disabled: 'ML Model Disabled',
                error: 'ML Model Error',
                checking: 'Checking ML Model...'
            },
            bedrock: {
                available: 'AWS Bedrock Ready',
                disabled: 'Bedrock Disabled',
                error: 'Bedrock Error',
                misconfigured: 'Bedrock Misconfigured',
                checking: 'Checking Bedrock...'
            },
            mediapipe: {
                available: 'MediaPipe Ready',
                unavailable: 'MediaPipe Unavailable',
                checking: 'Checking MediaPipe...'
            },
            config: {
                configured: 'AWS Config Present',
                missing: 'AWS Config Missing',
                checking: 'Checking Config...'
            }
        };
        return texts[key][status] || status;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 10,
            right: 10,
            background: 'rgba(0,0,0,0.8)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 1000
        }}>
            {Object.entries(status).map(([key, value]) => (
                <div key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: key === 'config' ? 0 : '4px'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(value)
                    }} />
                    <span>{getStatusText(key, value)}</span>
                </div>
            ))}
        </div>
    );
};

export default ConfigStatus;