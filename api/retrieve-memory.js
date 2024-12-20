import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { queryEmbedding } = req.body;

        if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
            return res.status(400).json({ error: 'queryEmbedding must be an array.' });
        }

        try {
            const response = await index.namespace('default').query({
                topK: 5,
                vector: queryEmbedding,
                includeValues: true,
                includeMetadata: true,
            });

            const retrievedTexts = response.matches.map(match => match.metadata.text);
            res.status(200).json(retrievedTexts);
        } catch (error) {
            console.error('Error retrieving memory:', error.message);
            res.status(500).json({ error: 'Failed to retrieve memory.' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed.' });
    }
}
