const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

const ITEMS_PER_PAGE = 15;
const BASE_URL = 'https://id.wikipedia.org/w/api.php';

app.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const start = (page - 1) * ITEMS_PER_PAGE; 

    try {
        const response = await axios.get(BASE_URL, {
            params: {
                action: 'query',
                format: 'json',
                list: 'recentchanges',
                rcnamespace: 0,
                rcprop: 'title|timestamp|user|comment',
                rclimit: ITEMS_PER_PAGE,
                rcmcontinue: start ? start : undefined,
            }
        });

        let articles = response.data.query.recentchanges || [];
        const hasMore = response.data['continue'] ? true : false;

        articles = articles.sort(() => Math.random() - 0.5);

        const articlesWithDescriptions = await Promise.all(
            articles.map(async (article) => {
                const title = article.title;
                const summaryResponse = await axios.get(BASE_URL, {
                    params: {
                        action: 'query',
                        format: 'json',
                        titles: title,
                        prop: 'extracts|pageimages',
                        exintro: true,
                        explaintext: true,
                        redirects: 1,
                        pithumbsize: 200
                    }
                });

                const page = Object.values(summaryResponse.data.query.pages)[0];
                let snippet = page.extract || 'Tidak ada deskripsi';
                let imageUrl = page.thumbnail ? page.thumbnail.source : null;

                if (snippet.length > 150) {
                    snippet = snippet.substring(0, 150).trim();
                    snippet += '...';
                }

                return { ...article, snippet, imageUrl };
            })
        );

        res.render('index', { articles: articlesWithDescriptions, page, hasMore, searchQuery: '' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving data from Wikipedia');
    }
});

app.get('/search', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.q || '';
    const start = (page - 1) * ITEMS_PER_PAGE;

    try {
        const response = await axios.get(BASE_URL, {
            params: {
                action: 'query',
                format: 'json',
                list: 'search',
                srsearch: searchQuery,
                srnamespace: 0,
                srlimit: ITEMS_PER_PAGE,
                sroffset: start ? start : undefined,
            }
        });

        const articles = response.data.query.search || [];
        const hasMore = articles.length === ITEMS_PER_PAGE;

        const articlesWithDescriptions = await Promise.all(
            articles.map(async (article) => {
                const title = article.title;
                const summaryResponse = await axios.get(BASE_URL, {
                    params: {
                        action: 'query',
                        format: 'json',
                        titles: title,
                        prop: 'extracts',
                        exintro: true,
                        explaintext: true,
                        redirects: 1,
                        pithumbsize: 200
                    }
                });

                const page = Object.values(summaryResponse.data.query.pages)[0];
                let snippet = page.extract || 'Tidak ada deskripsi';
                let imageUrl = page.thumbnail ? page.thumbnail.source : null;

                if (snippet.length > 150) {
                    snippet = snippet.substring(0, 150).trim();
                    snippet += '...';
                }

                return { ...article, snippet, imageUrl };
            })
        );

        res.render('index', { articles: articlesWithDescriptions, page, hasMore, searchQuery });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving data from Wikipedia');
    }
});

app.get('/wiki/:title', async (req, res) => {
    const title = req.params.title;
	const searchQuery = req.query.q || '';

    try {
        const response = await axios.get(BASE_URL, {
            params: {
                action: 'parse',
                page: title,
                format: 'json',
                prop: 'text|sections',
                sectionprop: 'line',
            }
        });

        const article = response.data.parse;
        if (!article) {
            return res.status(404).send('Artikel tidak ditemukan');
        }

        const articleText = article.text['*'];

        res.render('article', { article: articleText, title: article.title, searchQuery });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving article from Wikipedia');
    }
});

app.get('/api/articles', async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const start = (page - 1) * ITEMS_PER_PAGE; 

    try {
        const response = await axios.get(BASE_URL, {
            params: {
                action: 'query',
                format: 'json',
                list: 'recentchanges',
                rcnamespace: 0,
                rcprop: 'title|timestamp|user|comment',
                rclimit: ITEMS_PER_PAGE,
                rcmcontinue: start ? start : undefined,
            }
        });

        let articles = response.data.query.recentchanges || [];
        const hasMore = response.data['continue'] ? true : false;

        articles = articles.sort(() => Math.random() - 0.5);

        const articlesWithDescriptions = await Promise.all(
            articles.map(async (article) => {
                const title = article.title;
                const summaryResponse = await axios.get(BASE_URL, {
                    params: {
                        action: 'query',
                        format: 'json',
                        titles: title,
                        prop: 'extracts',
                        exintro: true,
                        explaintext: true,
                        redirects: 1
                    }
                });

                const page = Object.values(summaryResponse.data.query.pages)[0];
                let snippet = page.extract || 'Tidak ada deskripsi';

                if (snippet.length > 150) {
                    snippet = snippet.substring(0, 150).trim() + '...';
                }

                return { ...article, snippet };
            })
        );

        res.json({
            articles: articlesWithDescriptions,
            page,
            hasMore
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error retrieving data from Wikipedia' });
    }
});

app.get('/api/search', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.q || '';
    const start = (page - 1) * ITEMS_PER_PAGE;

    try {
        const response = await axios.get(BASE_URL, {
            params: {
                action: 'query',
                format: 'json',
                list: 'search',
                srsearch: searchQuery,
                srnamespace: 0,
                srlimit: ITEMS_PER_PAGE,
                sroffset: start ? start : undefined,
            }
        });

        const articles = response.data.query.search || [];
        const hasMore = articles.length === ITEMS_PER_PAGE;

        const articlesWithDescriptions = await Promise.all(
            articles.map(async (article) => {
                const title = article.title;
                const summaryResponse = await axios.get(BASE_URL, {
                    params: {
                        action: 'query',
                        format: 'json',
                        titles: title,
                        prop: 'extracts',
                        exintro: true,
                        explaintext: true,
                        redirects: 1
                    }
                });

                const page = Object.values(summaryResponse.data.query.pages)[0];
                let snippet = page.extract || 'Tidak ada deskripsi';

                if (snippet.length > 150) {
                    snippet = snippet.substring(0, 150).trim() + '...';
                }

                return { ...article, snippet };
            })
        );

        res.json({
            articles: articlesWithDescriptions,
            page,
            hasMore,
            searchQuery
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error retrieving search results from Wikipedia' });
    }
});

app.get('/api/article/:title', async (req, res) => {
    const title = req.params.title;

    try {
        const response = await axios.get(BASE_URL, {
            params: {
                action: 'parse',
                page: title,
                format: 'json',
                prop: 'text|sections',
                sectionprop: 'line',
            }
        });

        const article = response.data.parse;
        if (!article) {
            return res.status(404).json({ error: 'Artikel tidak ditemukan' });
        }

        const articleText = article.text['*'];

        res.json({
            title: article.title,
            content: articleText,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error retrieving article details from Wikipedia' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
