const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname,'../frontend/public/images');
const files = ['ho-hoan-kiem.webp','my-khe.webp','da-lat.webp'];
const credits = JSON.parse(fs.readFileSync(path.join(dir,'credits.json'),'utf8')).filter(x => files.includes(x.filename));
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
fs.writeFileSync(path.join(dir,'credits.json'),JSON.stringify(credits,null,2)+'\n');
fs.writeFileSync(path.join(dir,'credits.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ghi công hình ảnh</title><style>body{font:16px/1.7 system-ui;max-width:850px;margin:40px auto;padding:20px;color:#183541}article{padding:25px 0;border-bottom:1px solid #ddd}img{max-width:100%}a{color:#086c72}</style><h1>Ghi công hình ảnh</h1><p>Các ảnh được tái sử dụng từ Travel Platform, giữ nguyên thông tin tác giả và giấy phép.</p>${credits.map(x => `<article><h2>${escape(x.caption)}</h2><p>${escape(x.author)} · <a href="${escape(x.sourceUrl)}">Nguồn ảnh</a> · <a href="${escape(x.licenseUrl)}">${escape(x.license)}</a></p><p>${escape(x.modification)}</p><img width="400" src="${escape(x.filename)}" alt="${escape(x.caption)}"></article>`).join('')}</html>`);
