// Development version of Bedrock service using local proxy
class BedrockServiceDev {
    constructor() {
        this.initialized = false;
        this.proxyUrl = 'http://localhost:3001';
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            // Test if the proxy server is running
            const response = await fetch(`${this.proxyUrl}/api/analyze-sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: true })
            });

            this.initialized = response.ok || response.status === 500; // 500 is expected for test request
            return this.initialized;
        } catch (error) {
            console.warn('Development proxy server not available:', error);
            return false;
        }
    }

    async analyzeSignLanguage(imageDataUrl, targetSign) {
        if (!this.initialized) {
            const success = await this.initialize();
            if (!success) {
                throw new Error('Development proxy server not available');
            }
        }

        try {
            const response = await fetch(`${this.proxyUrl}/api/analyze-sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl, targetSign })
            });

            if (!response.ok) {
                throw new Error(`Proxy server error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            return this.parseSignAnalysisResponse(data.analysis, targetSign);
        } catch (error) {
            console.error('Development Bedrock analysis failed:', error);
            throw error;
        }
    }

    parseSignAnalysisResponse(responseText, targetSign) {
        try {
            // Extract JSON from response if it's wrapped in text
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
            const analysis = JSON.parse(jsonStr);

            return {
                score: analysis.matchPercentage || 0,
                engine: 'bedrock-dev-proxy',
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
                engine: 'bedrock-dev-fallback',
                details: {
                    feedback: 'Analysis completed but response parsing failed',
                    error: error.message
                }
            };
        }
    }
}

const bedrockServiceDevInstance = new BedrockServiceDev();
export default bedrockServiceDevInstance;