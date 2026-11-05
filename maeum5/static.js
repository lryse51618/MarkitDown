// 배포용 정적 파일 서버: `npm run build`로 만든 dist/만 내보낸다.
// Vite dev 서버는 프로젝트 파일(DB 포함)까지 내보내므로 공개 주소에 쓰면 안 된다.
import { readFile } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

// 요청 경로 → dist 안의 파일 경로. dist 밖을 가리키거나 해석할 수 없으면 null (경로 조작 차단)
export function distPath(root, url) {
  try {
    const file = join(root, decodeURIComponent(new URL(url, 'http://localhost').pathname));
    return file.startsWith(root + sep) ? file : null;
  } catch {
    return null;
  }
}

export const serveStatic = (root) => async (req, res) => {
  const file = distPath(root, req.url);
  const body = file && (await readFile(file).catch(() => null));
  if (body) {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    return res.end(body);
  }
  res.writeHead(200, { 'content-type': TYPES['.html'] }); // 없는 경로는 앱 첫 화면으로
  res.end(await readFile(join(root, 'index.html')));
};
