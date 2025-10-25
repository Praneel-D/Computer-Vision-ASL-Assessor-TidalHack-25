# ASL Form Correction App

An AI-powered American Sign Language (ASL) form correction application that helps users learn and improve their sign language skills through real-time feedback.

## Features

- **Real-time Sign Analysis**: Capture your sign language gestures via webcam
- **AI-Powered Feedback**: Advanced analysis using AWS Bedrock's Claude 3 Sonnet
- **Multi-Engine Support**: Falls back to MediaPipe or demo mode if Bedrock unavailable
- **Detailed Feedback**: Get specific suggestions for improving your form
- **Interactive Learning**: Navigate through different ASL signs to practice
- **Visual Examples**: Toggle to show/hide example demonstrations for each sign
- **Sign Gallery**: Browse all available signs with their visual examples
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React 19.2.0
- **AI/ML**: AWS Bedrock (Claude 3 Sonnet), MediaPipe Hand Landmarker
- **Webcam**: react-webcam
- **AWS SDK**: @aws-sdk/client-bedrock-runtime

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start with your ML model** (recommended):
   ```bash
   # Terminal 1: Start ML backend
   npm run ml-server
   
   # Terminal 2: Start React app
   npm run start:ml
   ```

3. **Alternative modes**:
   ```bash
   # Demo mode (no ML/AI)
   npm run start:demo
   
   # AWS Bedrock mode (requires setup)
   npm run start:bedrock
   ```

## Available Scripts

- `npm start` - Start the app (uses environment variables)
- `npm run start:ml` - Start with ML model backend (recommended)
- `npm run start:demo` - Start in demo mode (no AI)
- `npm run start:bedrock` - Start with AWS Bedrock
- `npm run ml-server` - Start Python ML backend server
- `npm run build` - Build for production
- `npm test` - Run tests

## Configuration

The app supports multiple analysis engines:

### 1. AWS Bedrock (Recommended)
- Most accurate sign language analysis
- Detailed feedback and suggestions
- Requires AWS setup (see AWS_SETUP.md)

### 2. MediaPipe (Fallback)
- Basic hand detection and analysis
- Works offline
- Limited to open/closed hand detection

### 3. Demo Mode (Fallback)
- Simulated scores for testing
- No external dependencies
- Always available

## Environment Variables

Create a `.env` file with:

```env
# AWS Configuration
REACT_APP_AWS_REGION=us-east-1
REACT_APP_COGNITO_IDENTITY_POOL_ID=your-identity-pool-id

# Feature Flags
REACT_APP_USE_BEDROCK=true
REACT_APP_FALLBACK_TO_MEDIAPIPE=true

# Optional
REACT_APP_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

## How It Works

1. **Sign Selection**: Choose from available ASL signs to practice
2. **Webcam Capture**: Position your hand in the camera view
3. **AI Analysis**: The system analyzes your gesture using:
   - AWS Bedrock for detailed form analysis
   - MediaPipe for hand landmark detection
   - Demo scorer as final fallback
4. **Feedback**: Receive a match percentage and detailed improvement suggestions

## Adding New Signs

Edit `src/data/signs.js` to add new signs:

```javascript
{
  id: 'new-sign',
  word: 'NEW SIGN',
  meaning: 'Description of the sign',
  tips: 'Instructions for performing the sign',
  sampleImage: null, // Optional: path to reference image
  expectedOpenHand: true // true for open hand, false for closed
}
```

## Architecture

```
src/
├── components/
│   ├── SignPrompt.js      # Display current sign to practice
│   ├── WebcamField.js     # Camera capture interface
│   ├── MatchGauge.js      # Score display
│   ├── FeedbackPanel.js   # AI feedback display
│   └── ConfigStatus.js    # System status indicator
├── services/
│   └── bedrockService.js  # AWS Bedrock integration
├── utils/
│   └── matcher.js         # Analysis engine coordination
├── data/
│   └── signs.js          # ASL signs database
└── App.js                # Main application
```

## Cost Considerations

When using AWS Bedrock:
- Claude 3 Sonnet: ~$3 per 1M tokens
- Each analysis: ~500-1000 tokens
- Estimated cost: $0.002-0.003 per analysis

## Troubleshooting

1. **Camera not working**: Check browser permissions
2. **Bedrock errors**: Verify AWS setup in AWS_SETUP.md
3. **No hand detected**: Ensure good lighting and hand visibility
4. **Poor accuracy**: Try different hand positions and lighting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add new signs or improve analysis accuracy
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For AWS Bedrock setup issues, see AWS_SETUP.md
For general questions, open an issue on GitHub