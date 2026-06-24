const express = require('express');
const { exec } = require('child_process');
const { writeFile, unlink, readFile } = require('fs/promises');
const { join } = require('path');
const { tmpdir } = require('os');
const { randomUUID } = require('crypto');
const { marked } = require('marked');

const app = express();
app.use(express.json({ limit: '50mb' }));

const SECRET = process.env.SERVICE_SECRET;

function htmlTemplate(body) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 55pt 60pt 65pt 60pt;
    @bottom-center {
      content: counter(page) " / " counter(pages);
      font-size: 9pt;
      color: #9ca3af;
    }
  }
  body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    color: #374151;
    line-height: 1.6;
  }
  h1 {
    font-size: 22pt;
    color: #111827;
    border-bottom: 1pt solid #d1d5db;
    padding-bottom: 10pt;
    margin-bottom: 20pt;
    margin-top: 0;
  }
  h2 {
    font-size: 14pt;
    color: #1f2937;
    margin-top: 18pt;
    margin-bottom: 8pt;
  }
  h3 {
    font-size: 11.5pt;
    color: #374151;
    margin-top: 12pt;
    margin-bottom: 5pt;
  }
  p { margin-bottom: 8pt; }
  ul, ol {
    padding-left: 20pt;
    margin-bottom: 8pt;
  }
  li {
    margin-bottom: 4pt;
    line-height: 1.5;
  }
  hr {
    border: none;
    border-bottom: 1pt solid #e5e7eb;
    margin: 12pt 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12pt;
    font-size: 10pt;
  }
  th, td {
    border: 1pt solid #d1d5db;
    padding: 5pt 8pt;
    text-align: left;
  }
  th {
    background-color: #f9fafb;
    font-weight: bold;
  }
  code {
    font-family: monospace;
    background: #f3f4f6;
    padding: 1pt 3pt;
  }
  em { font-style: italic; }
  strong { font-weight: bold; }
</style>
</head>
<body>${body}</body>
</html>`;
}

app.get('/health', (_, res) => res.json({ ok: true }));

app.post('/convert', async (req, res) => {
  if (SECRET && req.headers['x-service-secret'] !== SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { markdown } = req.body;
  if (!markdown || typeof markdown !== 'string') {
    return res.status(400).json({ error: 'markdown requerido' });
  }

  const id = randomUUID();
  const htmlPath = join(tmpdir(), `${id}.html`);
  const pdfPath = join(tmpdir(), `${id}.pdf`);

  try {
    const htmlBody = marked.parse(markdown);
    await writeFile(htmlPath, htmlTemplate(htmlBody), 'utf8');

    await new Promise((resolve, reject) => {
      exec(`prince "${htmlPath}" -o "${pdfPath}"`, (err, _stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });

    const pdf = await readFile(pdfPath);
    const fecha = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="acta-${fecha}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await Promise.all([
      unlink(htmlPath).catch(() => {}),
      unlink(pdfPath).catch(() => {}),
    ]);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Prince service en puerto ${PORT}`));
