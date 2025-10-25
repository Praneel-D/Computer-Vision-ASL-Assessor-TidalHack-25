// ML Model Service for ASL Recognition
// Connects to the Python Flask backend with your trained CNN model

class MLModelService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_ML_API_URL || 'http://localhost:5000';
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const data = await response.json();

            this.initialized = data.status === 'healthy' && data.model_loaded;
            return this.initialized;
        } catch (error) {
            console.warn('ML Model service not available:', error);
            return false;
        }
    }

    async predictSign(imageDataUrl) {
        if (!this.initialized) {
            const success = await this.initialize();
            if (!success) {
                throw new Error('ML Model service not available');
            }
        }

        try {
            const response = await fetch(`${this.baseUrl}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageDataUrl
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            return data.prediction;
        } catch (error) {
            console.error('ML prediction failed:', error);
            throw error;
        }
    }

    async analyzeSignLanguage(imageDataUrl, targetSign) {
        if (!this.initialized) {
            const success = await this.initialize();
            if (!success) {
                throw new Error('ML Model service not available');
            }
        }

        try {
            const response = await fetch(`${this.baseUrl}/analyze-sign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageDataUrl,
                    targetSign
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            return {
                score: data.score,
                engine: data.engine,
                details: data.details
            };
        } catch (error) {
            console.error('ML analysis failed:', error);
            throw error;
        }
    }

    async getAvailableSigns() {
        try {
            const response = await fetch(`${this.baseUrl}/available-signs`);
            const data = await response.json();

            if (data.success) {
                return data.signs;
            }
            return [];
        } catch (error) {
            console.error('Failed to get available signs:', error);
            return [];
        }
    }

    async getModelInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to get model info:', error);
            return { model_loaded: false };
        }
    }
}

const mlModelServiceInstance = new MLModelService();
export default mlModelServiceInstance;