const logger = require('../utils/logging');
const News = require('../models/News');

// Search and filter news
exports.searchNews = async (req, res) => {
  const startTime = Date.now();
  const { query, category, startDate, endDate, page = 1, limit = 9 } = req.query;

  logger.info('Search request', {
    query,
    category,
    startDate,
    endDate,
    page,
    limit
  });

  try {
    // Build search criteria
    const searchCriteria = {};

    if (query) {
      searchCriteria.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ];
    }

    if (category) {
      searchCriteria.category = category;
    }

    if (startDate || endDate) {
      searchCriteria.publishedAt = {};
      if (startDate) {
        searchCriteria.publishedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        searchCriteria.publishedAt.$lte = new Date(endDate);
      }
    }

    // Execute search
    const skip = (page - 1) * limit;
    const results = await News.find(searchCriteria)
      .skip(skip)
      .limit(parseInt(limit));

    const totalResults = await News.countDocuments(searchCriteria);

    // Calculate performance metrics
    const duration = Date.now() - startTime;

    // Log performance warning if search is slow
    if (duration > 1000) {
      logger.warn('Slow search detected', {
        duration,
        query,
        category,
        totalResults
      });
    }

    logger.info('Search completed', {
      duration,
      query,
      totalResults,
      returnedResults: results.length,
      page,
      limit
    });

    res.status(200).json({
      searchQuery: query,
      category: category || 'all',
      results,
      pagination: {
        total: totalResults,
        returned: results.length,
        page: parseInt(page),
        totalPages: Math.ceil(totalResults / limit),
        limit: parseInt(limit)
      },
      performanceMetrics: {
        responseTimeMs: duration
      }
    });
  } catch (error) {
    logger.error('Search error', {
      error: error.message,
      stack: error.stack,
      query,
      category
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get news by category
exports.getByCategory = async (req, res) => {
  const startTime = Date.now();
  const { category } = req.params;
  const { page = 1, limit = 10 } = req.query;

  logger.info('Fetch news by category', { category, page, limit });

  try {
    const skip = (page - 1) * limit;
    const news = await News.find({ category })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await News.countDocuments({ category });

    const duration = Date.now() - startTime;

    logger.info('Category news fetched', {
      duration,
      category,
      total,
      returned: news.length
    });

    res.status(200).json({
      category,
      news,
      pagination: {
        total,
        returned: news.length,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      },
      performanceMetrics: {
        responseTimeMs: duration
      }
    });
  } catch (error) {
    logger.error('Get by category error', {
      error: error.message,
      stack: error.stack,
      category
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//Get News by ID
exports.getNewsById = async (req, res) => {
  const newsId = req.params.newsId;

  logger.info('Fetch news by ID', { newsId });

  try {
    // IMPORTANT: your news_id is a STRING, NOT ObjectId
    const newsItem = await News.findOne({ news_id: newsId });

    if (!newsItem) {
      logger.warn('News item not found', { newsId });
      return res.status(404).json({ message: "News item not found" });
    }

    logger.info('News item fetched successfully', { newsId });

    res.status(200).json({ news: newsItem });
  } catch (error) {
    logger.error('Get news by ID error', {
      error: error.message,
      stack: error.stack,
      newsId
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await News.distinct("category");
    res.status(200).json({ categories });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
