require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const News = require("../models/News");

const NEWS_API_KEY = process.env.NEWS_API_KEY || "";
const CATEGORIES = [
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
];

// Generate a stable ID for deduplication
const createId = (input) =>
  crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);

// Summarize long text
const summarize = (text) => {
  if (!text) return "";
  const clean = String(text).trim();
  return clean.length <= 260 ? clean : `${clean.slice(0, 257)}...`;
};

// Normalize each article to fit Mongo schema
const normalizeArticle = (article, category) => {
  const title = article.title || "";
  const source = article.source?.name || article.source || "";
  const description = article.description || article.content || "";
  const url = article.url || "";
  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();

  const news_id = createId(url || `${title}-${source}-${publishedAt}`);

  return {
    news_id,
    title,
    source,
    category,
    description: summarize(description),
    content: summarize(description),
    url,
    publishedAt,
  };
};

// Remove duplicates in memory
const dedupe = (articles) => {
  const seen = new Set();
  return articles.filter((a) => {
    if (seen.has(a.news_id)) return false;
    seen.add(a.news_id);
    return true;
  });
};

// Remove already existing items in DB
const removeExisting = async (articles) => {
  if (!articles.length) return [];
  const ids = articles.map((n) => n.news_id);
  const existing = await News.find({ news_id: { $in: ids } }).select("news_id").lean();
  const existingIds = new Set(existing.map((e) => e.news_id));
  return articles.filter((n) => !existingIds.has(n.news_id));
};

// Fetch recent articles from NewsAPI
async function fetchNewsFromAPI({ queries = CATEGORIES, pageSize = 20 } = {}) {
  if (!NEWS_API_KEY) {
    console.error("NEWS_API_KEY is missing in .env");
    return [];
  }

  const allResults = [];

  for (const q of queries) {
    try {
      const resp = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q,
          language: "en",
          sortBy: "publishedAt",
          pageSize,
          apiKey: NEWS_API_KEY,
        },
        timeout: 8000,
      });

      const data = resp.data;
      if (data.status !== "ok" || !data.articles?.length) continue;

      const normalized = data.articles.map((a) => normalizeArticle(a, q));
      allResults.push(...normalized);
    } catch (err) {
      console.warn(`Error fetching for "${q}":`, err.response?.data?.message || err.message);
    }
  }

  const unique = dedupe(allResults);
  console.log(`Fetched and deduped ${unique.length} articles`);
  return unique;
}

// Fetch, dedupe, and save new articles
async function fetchAndStoreOnce() {
  const queries = [...CATEGORIES, "world"];
  const fetched = await fetchNewsFromAPI({ queries, pageSize: 25 });

  if (!fetched.length) {
    console.log("No articles fetched this run.");
    return { inserted: 0, skipped: 0 };
  }

  const newOnly = await removeExisting(fetched);
  if (!newOnly.length) {
    console.log("All articles already exist.");
    return { inserted: 0, skipped: fetched.length };
  }

  try {
    const result = await News.insertMany(newOnly, { ordered: false });
    console.log(`Inserted ${result.length} new articles.`);
    return { inserted: result.length, skipped: fetched.length - result.length };
  } catch (err) {
    console.error("Insert error:", err.message);
    return { inserted: 0, skipped: fetched.length };
  }
}

module.exports = { fetchAndStoreOnce, fetchNewsFromAPI };
