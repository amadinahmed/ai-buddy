import express from 'express';
import { Pinecone } from '@pinecone-database/pinecone';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

// Function to generate embeddings using OpenAI
async function generateEmbedding(text) {
    try {
        const response = await axios.post('https://api.openai.com/v1/embeddings', {
            input: text,
            model: 'text-embedding-ada-002',
        }, {
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        });
        return response.data.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        throw new Error('Failed to generate embedding.');
    }
}

// Store memory endpoint
app.post('/store-memory', async (req, res) => {
    try {
        const { messageId, text } = req.body;

        if (!messageId || !text) {
            return res.status(400).json({ error: 'messageId and text are required.' });
        }

        const embedding = await generateEmbedding(text);

        await index.namespace('ai-friend').upsert([
            { id: messageId, values: embedding, metadata: { text } },
        ]);

        res.send('Memory stored.');
    } catch (error) {
        console.error('Error storing memory:', error.message);
        res.status(500).json({ error: 'Failed to store memory.' });
    }
});

// Retrieve memory endpoint
app.post('/retrieve-memory', async (req, res) => {
    try {
        const { queryText } = req.body;

        if (!queryText) {
            return res.status(400).json({ error: 'queryText is required.' });
        }

        const queryEmbedding = await generateEmbedding(queryText);

        const response = await index.namespace('ai-friend').query({
            topK: 5,
            vector: queryEmbedding,
            includeValues: false,
            includeMetadata: true,
        });

        const retrievedTexts = response.matches.map(match => match.metadata.text);
        res.json(retrievedTexts);
    } catch (error) {
        console.error('Error retrieving memory:', error.message);
        res.status(500).json({ error: 'Failed to retrieve memory.' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
