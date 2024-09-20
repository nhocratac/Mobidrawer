const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.post('/api/image/generation', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.limewire.com/api/image/generation',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Version': 'v1',
          Accept: 'application/json',
          Authorization: `Bearer <YOUR_lmwr_sk_*_HERE>`
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).send(error.message);
  }
});

app.listen(4000, () => {
  console.log('Proxy server running on http://localhost:4000');
});