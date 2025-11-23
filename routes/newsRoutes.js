const express = require('express');
const { fetchAndStoreOnce, fetchNewsFromAPI } = require('../services/newsFetcher');
const News = require('../models/News');

const router = express.Router();

// Fetch and store news
router.post('/fetch-now', async (req, res) => {
  try {
    const result = await fetchAndStoreOnce();
    res.json({ message: 'Fetch completed', ...result });
  } catch (e) {
    console.error('Error fetching news:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// Get all stored news
router.get('/all', async (req, res) => {
  try {
    const news = await News.find().sort({ publishedAt: -1 }).limit(20);
    res.json(news);
  } catch (err) {
    console.error('Error fetching news:', err.message);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});
// get a preview of the news from api 
router.get('/fetch-preview', async (req, res) => {
  try {
    const qParam = req.query.q;
    const queries = qParam ? qParam.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const articles = await fetchNewsFromAPI({ queries });
    res.json({ message: 'Preview fetched successfully', count: articles.length, sample: articles.slice(0, 10) });
  } catch (err) {
    console.error('Error in /fetch-preview:', err?.message || err);
    res.status(500).json({ message: err?.message || 'Preview failed' });
  }
});
module.exports = router;
