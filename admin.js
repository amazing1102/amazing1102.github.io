const OWNER = 'amazing1102';
const REPO = 'amazing1102.github.io';
const BRANCH = 'main';
const POSTS_PATH = '_posts';
const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPO}`;
const TOKEN_KEY = 'cloverneo-admin-token';

const tokenInput = document.querySelector('#token');
const connectButton = document.querySelector('#connect');
const authStatus = document.querySelector('#auth-status');
const connectionDot = document.querySelector('#connection-dot');
const workspace = document.querySelector('#workspace');
const publishForm = document.querySelector('#publish-form');
const publishStatus = document.querySelector('#publish-status');
const postsStatus = document.querySelector('#posts-status');
const postList = document.querySelector('#post-list');
let token = '';

function setStatus(element, message, type = '') {
  element.textContent = message;
  element.dataset.type = type;
}

function headers() {
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}

async function github(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (response.status === 404 && path.startsWith('/contents/_posts?')) return [];
  if (!response.ok) throw new Error(payload?.message || `GitHub 请求失败（${response.status}）`);
  return payload;
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function slugify(value) {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 54) || 'note';
}

function today() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
}

function postFile(title) {
  return `${today()}-${slugify(title)}.md`;
}

function frontMatter({ title, category, summary, body }) {
  return ['---', `title: ${JSON.stringify(title)}`, `category: ${category}`, `summary: ${JSON.stringify(summary)}`, `date: ${today()} 12:00:00 +0800`, '---', '', body.trim(), ''].join('\n');
}

async function connect() {
  const candidate = tokenInput.value.trim();
  if (!candidate) { setStatus(authStatus, '请先填写 GitHub Token。', 'error'); return; }
  connectButton.disabled = true;
  setStatus(authStatus, '正在验证权限……');
  token = candidate;
  try {
    const repo = await github('');
    if (!repo.permissions?.push) throw new Error('这个 Token 没有此仓库的写入权限。');
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch {}
    disconnectButton.hidden = false;
    tokenInput.value = '';
    connectionDot.dataset.connected = 'true';
    workspace.hidden = false;
    setStatus(authStatus, `已连接 ${repo.full_name}`, 'success');
    await loadPosts();
  } catch (error) {
    disconnect();
    setStatus(authStatus, error.message, 'error');
  } finally { connectButton.disabled = false; }
}

async function loadPosts() {
  setStatus(postsStatus, '正在加载文章……');
  try {
    const files = await github(`/contents/${POSTS_PATH}?ref=${BRANCH}`);
    const posts = files.filter(file => file.type === 'file' && file.name.endsWith('.md')).sort((a, b) => b.name.localeCompare(a.name));
    postList.replaceChildren();
    if (!posts.length) { setStatus(postsStatus, '还没有已发布文章。'); return; }
    posts.forEach(post => {
      const row = document.createElement('div');
      row.className = 'admin-post';
      const name = document.createElement('strong');
      name.textContent = post.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '').replace(/-/g, ' ');
      const date = document.createElement('time');
      date.textContent = post.name.slice(0, 10);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'danger-button'; button.textContent = '删除';
      button.addEventListener('click', () => removePost(post, button));
      row.append(name, date, button); postList.append(row);
    });
    setStatus(postsStatus, `${posts.length} 篇文章`);
  } catch (error) { setStatus(postsStatus, error.message, 'error'); }
}

async function removePost(post, button) {
  if (!window.confirm(`确定删除「${post.name}」吗？`)) return;
  button.disabled = true;
  setStatus(postsStatus, `正在删除 ${post.name}……`);
  try {
    await github(`/contents/${POSTS_PATH}/${encodeURIComponent(post.name)}`, { method: 'DELETE', body: JSON.stringify({ message: `Delete post ${post.name}`, sha: post.sha, branch: BRANCH }) });
    await loadPosts();
    if (postsStatus.dataset.type !== 'error') setStatus(postsStatus, '已删除，主页将在 Pages 构建后更新。', 'success');
  } catch (error) { button.disabled = false; setStatus(postsStatus, error.message, 'error'); }
}

publishForm.addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(publishForm));
  const filename = postFile(values.title);
  const path = `${POSTS_PATH}/${encodeURIComponent(filename)}`;
  const content = frontMatter(values);
  const submit = publishForm.querySelector('[type="submit"]');
  submit.disabled = true; setStatus(publishStatus, '正在发布……');
  try {
    await github(`/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message: `Publish post ${values.title}`, content: encodeBase64(content), branch: BRANCH }) });
    publishForm.reset();
    setStatus(publishStatus, `已发布 ${filename}，Pages 正在重新构建。`, 'success');
    await loadPosts();
  } catch (error) { setStatus(publishStatus, error.message, 'error'); }
  finally { submit.disabled = false; }
});

document.querySelector('#clear-draft').addEventListener('click', () => { publishForm.reset(); setStatus(publishStatus, '已清空。'); });
document.querySelector('#refresh-posts').addEventListener('click', loadPosts);
connectButton.addEventListener('click', connect);
tokenInput.addEventListener('keydown', event => { if (event.key === 'Enter') connect(); });


const panel = document.querySelector('#admin');
const manageLink = document.querySelector('.manage-link');
const disconnectButton = document.querySelector('#disconnect');

function disconnect() {
  token = '';
  tokenInput.value = '';
  try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
  connectionDot.dataset.connected = 'false';
  workspace.hidden = true;
  disconnectButton.hidden = true;
  postList.replaceChildren();
  setStatus(authStatus, '已退出管理。');
}
disconnectButton.addEventListener('click', disconnect);

function syncPanel() {
  const open = location.hash === '#admin';
  panel.hidden = !open;
  manageLink.setAttribute('aria-expanded', String(open));
  manageLink.textContent = open ? '收起管理' : '管理文章';
  manageLink.hash = open ? 'notes' : 'admin';
  if (!open) return;

  const secure = window.isSecureContext;
  document.querySelector('#auth-panel').hidden = !secure;
  document.querySelector('#secure-entry').hidden = secure;
  if (secure && !token && !connectButton.disabled) {
    try { tokenInput.value ||= sessionStorage.getItem(TOKEN_KEY) || ''; } catch {}
    if (tokenInput.value) connect();
  }
  document.querySelector('#notes').scrollIntoView();
}
window.addEventListener('hashchange', syncPanel);
syncPanel();
