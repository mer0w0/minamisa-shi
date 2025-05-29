const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// public を静的配信
app.use(express.static(path.join(__dirname, 'public')));

// ルートアクセスで index.html を返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// net?q=... プロキシ取得
app.get('/net', async (req, res) => {
  const targetUrl = decodeURIComponent(req.query.q || '');
  if (!targetUrl.startsWith('http')) {
    return res.status(400).send('無効なURLです。http/httpsで始めてください。');
  }
  try {
    const fetchRes = await fetch(targetUrl);
    const ct = fetchRes.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      const text = await fetchRes.text();
      const $ = cheerio.load(text);
      // リンク・リソース書き換え
      $('a[href]').each((i,el)=>{
        const h = $(el).attr('href');
        if(h && !h.startsWith('#') && !h.startsWith('mailto:')){
          const abs = new URL(h, targetUrl).href;
          $(el).attr('href','/net?q='+encodeURIComponent(abs));
        }
      });
      $('img[src], script[src], link[href]').each((i,el)=>{
        const attr = el.name==='link'?'href':'src';
        const v = $(el).attr(attr);
        if(v){
          const abs = new URL(v, targetUrl).href;
          $(el).attr(attr,'/net?q='+encodeURIComponent(abs));
        }
      });
      // タイトル補正
      const t = $('title').text();
      if(!t.includes('南差市教育情報支援センター')){
        $('title').text(t+' - 南差市教育情報支援センター');
      }
      res.set('content-type','text/html; charset=utf-8');
      return res.send($.html());
    } else {
      const buf = await fetchRes.buffer();
      res.set('content-type', ct);
      return res.send(buf);
    }
  } catch(err) {
    return res.status(500).send('取得エラー：'+err.message);
  }
});

// その他 .html ファイルへの直接アクセスを許可
app.get('/:page.html', (req, res) => {
  const p = req.params.page;
  return res.sendFile(path.join(__dirname, 'public', p + '.html'));
});

app.listen(PORT, () => {
  console.log(`南差市教育情報支援センター 起動中: http://localhost:${PORT}`);
});
