import { Pinecone } from '@pinecone-database/pinecone';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

async function generateEmbedding(text) {
    const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        { input: text, model: 'text-embedding-ada-002' },
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );
    return response.data.data[0].embedding;
}

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { messageId, text } = req.body;

        if (!messageId || !text) {
            return res.status(400).json({ error: 'messageId and text are required.' });
        }

        try {
            const embedding = await generateEmbedding(text);
            await index.namespace('default').upsert([{ id: messageId, values: embedding, metadata: { text } }]);

            res.status(200).json({ message: 'Memory stored.' });
        } catch (error) {
            console.error('Error storing memory:', error.message);
            res.status(500).json({ error: 'Failed to store memory.' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed.' });
    }
}
