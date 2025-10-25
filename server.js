// Development server for AWS Bedrock proxy
// DO NOT USE IN PRODUCTION - This exposes your AWS credentials
const express = require('express');
const cors = require('cors');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const app = express();
const port = 3001;

// Configure AWS client with your credentials
const client = new BedrockRuntimeClient({
    region: process.env.AWS_DEFAULT_REGION || 'us-west-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
    }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/analyze-sign', async (req, res) => {
    try {
        const { imageDataUrl, targetSign } = req.body;

        // Convert data URL to base64
        const base64Image = imageDataUrl.split(',')[1];

        // Prepare the prompt
        const prompt = `You are an expert American Sign Language (ASL) instructor analyzing hand gestures for form correction.

Target Sign: "${targetSign.word}"
Meaning: ${targetSign.meaning}
Instructions: ${targetSign.tips}
Expected hand position: ${targetSign.expectedOpenHand ? 'Open hand' : 'Closed hand/fist'}

Please analyze the image and provide:
1. A match percentage (0-100) for how well the gesture matches the target sign
2. Specific feedback on hand position, finger placement, and overall form
3. Suggestions for improvement if the match is below 80%

Respond in this JSON format:
{
  "matchPercentage": <number 0-100>,
  "feedback": "<detailed feedback>",
  "suggestions": "<improvement suggestions>",
  "handDetected": <boolean>,
  "formAnalysis": {
    "handPosition": "<description>",
    "fingerPlacement": "<description>",
    "overallForm": "<description>"
  }
}`;

        const requestBody = {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1000,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            contentType: 'application/json',
            body: JSON.stringify(requestBody),
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        res.json({
            success: true,
            analysis: responseBody.content[0].text
        });

    } catch (error) {
        console.error('Bedrock analysis failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Development server running at http://localhost:${port}`);
    console.log('⚠️  WARNING: This server exposes AWS credentials - use only for development!');
});