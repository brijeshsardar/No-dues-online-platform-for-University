export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const backendUrl = process.env.BACKEND_URL || process.env.VITE_API_URL;
  if (!backendUrl) {
    return res.status(503).json({
      success: false,
      message: 'CT University API Gateway: Backend server URL is not configured.',
      help: 'To connect this Vercel deployment to your backend, add the BACKEND_URL environment variable in your Vercel Project Settings.',
      endpoint: req.url,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const targetUrl = `${backendUrl.replace(/\/+$/, '')}${req.url}`;
    const headers = { ...req.headers };
    delete headers.host;

    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    const buffer = await response.arrayBuffer();
    return res.status(response.status).send(Buffer.from(buffer));
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: 'Failed to communicate with backend server.',
      details: error.message,
    });
  }
}
