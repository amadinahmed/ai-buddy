export default async function handler(req, res) {
    if (req.method === 'GET') {
        // Respond with a basic status message
        res.status(200).json({
            status: 'success',
            message: 'API is running and healthy!',
        });
    } else {
        res.status(405).json({
            status: 'error',
            message: 'Method not allowed. Use GET.',
        });
    }
}
