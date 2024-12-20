import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

// Function to generate embeddings using OpenAI
async function generateEmbedding(text) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/embeddings',
            {
                input: text,
                model: 'text-embedding-ada-002',
            },
            {
                headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            }
        );
        return response.data.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        throw new Error('Failed to generate embedding.');
    }
}

// Endpoint to store memory
app.post('/store-memory', async (req, res) => {
    try {
        const { messageId, text } = req.body;

        if (!messageId || !text) {
            return res.status(400).json({ error: 'messageId and text are required.' });
        }

        const embedding = await generateEmbedding(text);

        await index.namespace('default').upsert([
            { id: messageId, values: embedding, metadata: { text } },
        ]);

        res.send('Memory stored.');
    } catch (error) {
        console.error('Error storing memory:', error.message);
        res.status(500).json({ error: 'Failed to store memory.' });
    }
});

// Endpoint to retrieve memory
app.post('/retrieve-memory', async (req, res) => {
    try {
        const { queryEmbedding } = req.body;

        if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
            return res.status(400).json({ error: 'queryEmbedding must be an array.' });
        }

        const response = await index.namespace('default').query({
            topK: 5,
            vector: queryEmbedding,
            includeValues: true,
            includeMetadata: true,
        });

        const retrievedTexts = response.matches.map((match) => match.metadata.text);
        res.json(retrievedTexts);
    } catch (error) {
        console.error('Error retrieving memory:', error.message);
        res.status(500).json({ error: 'Failed to retrieve memory.' });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.send('Server is running.');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
