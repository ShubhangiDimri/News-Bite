const express = require('express');
const News = require('../models/News');
const UserNews = require('../models/UserNews');
const User = require('../models/User');
const { fetchNewsFromAPI } = require('../services/newsFetcher');
const checkUser = require('../middlewares/checkUser');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply checkUser to all public routes to populate res.locals.user if logged in
router.use(checkUser);

router.get('/', async (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9; // 3x3 grid
        const skip = (page - 1) * limit;

        const totalNews = await News.countDocuments();
        const totalPages = Math.ceil(totalNews / limit);

        const news = await News.find()
            .sort({ likes: -1, publishedAt: -1 })
            .skip(skip)
            .limit(limit);

        let userInteractions = {};
        if (req.user) {
            const interactions = await UserNews.find({ username: req.user.username });
            interactions.forEach(interaction => {
                userInteractions[interaction.news_id] = {
                    liked: interaction.likes > 0,
                    bookmarked: interaction.bookmarked
                };
            });
        }

        const newsWithInteractions = news.map(item => {
            const interaction = userInteractions[item._id] || {};
            return {
                ...item.toObject(),
                isLiked: interaction.liked || false,
                isBookmarked: interaction.bookmarked || false
            };
        });

        res.render('index', {
            title: 'Home - News Summarizer',
            news: newsWithInteractions,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/login', (req, res) => {
    if (req.user) return res.redirect('/');
    res.render('login', { title: 'Login' });
});

router.get('/register', (req, res) => {
    if (req.user) return res.redirect('/');
    res.render('register', { title: 'Sign Up' });
});

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        // Fetch full user details including photo
        const user = await User.findById(req.user.userId).select('username bio_data photo');

        res.render('profile', {
            title: 'Profile',
            user: {
                ...req.user,
                bio_data: user.bio_data,
                profileImage: user.photo
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/activity', authMiddleware, async (req, res) => {
    try {
        // Fetch Activity
        const activity = await UserNews.find({ username: req.user.username })
            .sort({ createdAt: -1 })
            .limit(20);

        // We need to fetch the actual news details for these activities
        const newsIds = activity.map(a => a.news_id);
        const newsItems = await News.find({ _id: { $in: newsIds } });

        const activityWithDetails = activity.map(act => {
            const news = newsItems.find(n => n._id.toString() === act.news_id);
            return {
                ...act.toObject(),
                newsTitle: news ? news.title : 'News unavailable',
                newsUrl: news ? news.url : '#',
                newsDate: news ? news.publishedAt : null
            };
        });

        res.render('activity', {
            title: 'Recent Activity',
            user: req.user,
            activity: activityWithDetails
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/bookmarks', authMiddleware, async (req, res) => {
    try {
        const userInteractions = await UserNews.find({
            username: req.user.username,
            bookmarked: true
        });

        const newsIds = userInteractions.map(ui => ui.news_id);
        const bookmarks = await News.find({ _id: { $in: newsIds } });

        res.render('bookmarks', {
            title: 'My Bookmarks',
            user: req.user,
            bookmarks
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/search', async (req, res) => {
    const query = req.query.q || '';
    const category = req.query.category || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    let results = [];

    if (query || category) {
        try {
            // If category is selected but no query, use category as query
            const searchTerms = query ? query.split(',').map(s => s.trim()).filter(Boolean) : [];
            if (category && !searchTerms.includes(category)) {
                searchTerms.push(category);
            }

            const options = {
                queries: searchTerms.length > 0 ? searchTerms : [category],
                from: startDate,
                to: endDate
            };

            results = await fetchNewsFromAPI(options);
        } catch (err) {
            console.error(err);
        }
    }

    res.render('search', {
        title: 'Search',
        query,
        category,
        startDate,
        endDate,
        results
    });
});

router.get('/admin', authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).send('Access Denied: Admin privileges required');
        }

        // Fetch all users for admin panel
        const users = await User.find().select('-password').sort({ createdAt: -1 });

        // Get user statistics
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'active' });
        const suspendedUsers = await User.countDocuments({ status: 'suspended' });
        const adminUsers = await User.countDocuments({ role: 'admin' });

        res.render('admin', {
            title: 'Admin Panel',
            user: req.user,
            users,
            stats: {
                total: totalUsers,
                active: activeUsers,
                suspended: suspendedUsers,
                admins: adminUsers
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('authToken');
    res.redirect('/');
});

module.exports = router;
