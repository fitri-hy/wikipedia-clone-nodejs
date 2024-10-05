const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

const WIKI_API_URL = 'https://id.wikipedia.org/w/api.php';

router.get('/', (req, res) => {
    res.render('index');
});

router.post('/ask', async (req, res) => {
    const { question } = req.body;

    try {
        // Pencarian artikel menggunakan OpenSearch API
        const searchResponse = await axios.get(WIKI_API_URL, {
            params: {
                action: 'opensearch',
                search: question,
                format: 'json',
                origin: '*'
            }
        });

        const results = searchResponse.data;

        if (results[1].length === 0) {
            return res.render('response', { content: 'Artikel tidak ditemukan.', tables: [] });
        }

        // Ambil judul artikel pertama yang relevan
        const title = results[1][0];

        // Dapatkan konten dari artikel
        const contentResponse = await axios.get(WIKI_API_URL, {
            params: {
                action: 'query',
                prop: 'extracts',
                exintro: true,
                explain: true,
                titles: title,
                format: 'json',
                origin: '*'
            }
        });

        const page = contentResponse.data.query.pages;
        const pageContent = Object.values(page)[0];

        if (pageContent.missing) {
            return res.render('response', { content: 'Artikel tidak ditemukan.', tables: [] });
        }

        // Ambil halaman lengkap untuk menguraikan tabel
        const fullPageResponse = await axios.get(`https://id.wikipedia.org/wiki/${encodeURIComponent(title)}`);
        const $ = cheerio.load(fullPageResponse.data);
        const tables = [];

        // Uraikan tabel yang ada di halaman
        $('table').each((index, table) => {
            const tableData = [];
            $(table).find('tr').each((rowIndex, row) => {
                const rowData = [];
                $(row).find('th, td').each((colIndex, col) => {
                    rowData.push($(col).text().trim());
                });
                tableData.push(rowData);
            });
            tables.push(tableData);
        });

        // Render halaman dengan konten artikel dan tabel
        res.render('response', { content: pageContent.extract, tables });
    } catch (error) {
        console.error(error);
        res.render('response', { content: 'Terjadi kesalahan saat mengakses Wikipedia.', tables: [] });
    }
});

module.exports = router;
