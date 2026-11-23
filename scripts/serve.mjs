import { readFile, realpath } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const port = Number(process.argv[2] ?? 8000);
const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const publicFiles = new Set([
  'index.html', 'core.mjs', 'app.mjs', 'sample-quotes.mjs', 'README.md', 'CONTRIBUTING.md', 'SCHEMA.md',
  'CODE_OF_CONDUCT.md', 'LICENSE', 'docs/field-guide.md', 'docs/dealer-messages.md',
  'docs/shop-with-an-assistant.md', 'docs/dealer-tracker.csv', 'docs/c300-search.md',
  'examples/local.json', 'examples/shipped.json',
]);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Choose a port from 1 through 65535, e.g. npm start -- 8001.');
  process.exit(1);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(request.url.split('?')[0]);
  } catch {
    response.writeHead(400).end();
    return;
  }

  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!pathname.startsWith('/') || !publicFiles.has(name)) {
    response.writeHead(404).end();
    return;
  }

  try {
    const filename = resolve(root, name);
    if (await realpath(filename) !== filename) {
      response.writeHead(404).end();
      return;
    }
    const contents = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': types[extname(name)] ?? 'text/plain; charset=utf-8',
      'Content-Length': contents.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
  }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is in use. Choose another port with npm start -- ${port === 65535 ? 8000 : port + 1}.`);
  } else {
    console.error(`Could not start Dealboard: ${error.message}`);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Open http://${host}:${port}/ in your browser. Press Ctrl+C to stop.`);
});
