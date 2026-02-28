// server.js - ローカルWebサーバー（外部ライブラリ不要）
// 起動方法: node server.js
// ブラウザで http://localhost:3000 を開く

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

// MIMEタイプの定義（ES Moduleに必要なapplication/javascriptを含む）
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.mp3':  'audio/mpeg',
    '.ogg':  'audio/ogg',
    '.wav':  'audio/wav',
    '.mp4':  'video/mp4',
    '.webm': 'video/webm',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
};

const server = http.createServer((req, res) => {
    // URLのクエリ部分を取り除く
    let urlPath = req.url.split('?')[0];

    // ルートへのアクセスはindex.htmlを返す
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(ROOT, urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.warn(`[404] ${req.url}`);
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found');
            } else {
                console.error(`[500] ${req.url}`, err);
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('500 Internal Server Error');
            }
            return;
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            // ES Moduleのためにオリジンをlocalhost以外には許可しない
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'unsafe-none',
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('====================================');
    console.log(' クビを回避せよ！！ Webサーバー起動');
    console.log('====================================');
    console.log(`✅ 起動完了！ブラウザで以下のURLを開いてください:`);
    console.log(`   http://localhost:${PORT}`);
    console.log('------------------------------------');
    console.log('⛔ 終了するには Ctrl + C を押してください');
});
