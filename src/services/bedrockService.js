import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

class BedrockService {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            // Initialize Bedrock client with credentials
            // You can use different credential providers based on your setup
            this.client = new BedrockRuntimeClient({
                region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
                credentials: fromCognitoIdentityPool({
                    clientConfig: { region: process.env.REACT_APP_AWS_REGION || 'us-east-1' },
                    identityPoolId: process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID,
                }),
            });

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Bedrock service:', error);
            return false;
        }
    }

    async analyzeSignLanguage(imageDataUrl, targetSign) {
        if (!this.initialized) {
            const success = await this.initialize();
            if (!success) {
                throw new Error('Bedrock service not initialized');
            }
        }

        try {
            // Convert data URL to base64
            const base64Image = imageDataUrl.split(',')[1];

            // Prepare the prompt for sign language analysis
            const prompt = this.buildSignAnalysisPrompt(targetSign);

            // Use Claude 3 Sonnet for multimodal analysis
            const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

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
                modelId,
                contentType: 'application/json',
                body: JSON.stringify(requestBody),
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));

            return this.parseSignAnalysisResponse(responseBody.content[0].text, targetSign);
        } catch (error) {
            console.error('Bedrock analysis failed:', error);
            throw error;
        }
    }

    buildSignAnalysisPrompt(targetSign) {
        return `You are an expert American Sign Language (ASL) instructor analyzing hand gestures for form correction.

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
    }

    parseSignAnalysisResponse(responseText, targetSign) {
        try {
            // Extract JSON from response if it's wrapped in text
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
            const analysis = JSON.parse(jsonStr);

            return {
                score: analysis.matchPercentage || 0,
                engine: 'bedrock-claude',
                details: {
                    feedback: analysis.feedback,
                    suggestions: analysis.suggestions,
                    handDetected: analysis.handDetected,
                    formAnalysis: analysis.formAnalysis,
                    targetSign: targetSign.word
                }
            };
        } catch (error) {
            console.error('Failed to parse Bedrock response:', error);
            // Fallback to basic analysis
            return {
                score: 50,
                engine: 'bedrock-fallback',
                details: {
                    feedback: 'Analysis completed but response parsing failed',
                    error: error.message
                }
            };
        }
    }
}

const bedrockServiceInstance = new BedrockService();
export default bedrockServiceInstance;