const OWNER = 'amazing1102';
const REPO = 'amazing1102.github.io';
const BRANCH = 'main';
const POSTS_PATH = '_posts';
const UPLOADS_PATH = 'assets/uploads';
const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPO}`;
const TOKEN_KEY = 'cloverneo-admin-token';
const DRAFT_DB = 'cloverneo-editor';
const DRAFT_STORE = 'drafts';

const tokenInput = document.querySelector('#token');
const connectButton = document.querySelector('#connect');
const authStatus = document.querySelector('#auth-status');
const connectionDot = document.querySelector('#connection-dot');
const workspace = document.querySelector('#workspace');
const publishForm = document.querySelector('#publish-form');
const publishStatus = document.querySelector('#publish-status');
const postsStatus = document.querySelector('#posts-status');
const postList = document.querySelector('#post-list');
const importFile = document.querySelector('#import-file');
const imageFile = document.querySelector('#image-file');
const importStatus = document.querySelector('#import-status');
const draftState = document.querySelector('#draft-state');
const bodyField = publishForm.elements.body;
let token = '';
let draftDb;
let draftRevision = 0;
let editorReady = false;
let editorSelection = { start: 0, end: 0 };

function openDraftDb() {
  draftDb ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DRAFT_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return draftDb;
}

async function writeDraft(values) {
  const db = await openDraftDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE, 'readwrite');
    const store = transaction.objectStore(DRAFT_STORE);
    if (values) store.put(values, 'current');
    else store.delete('current');
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
  });
}

async function restoreDraft() {
  const db = await openDraftDb();
  const values = await new Promise((resolve, reject) => {
    const request = db.transaction(DRAFT_STORE).objectStore(DRAFT_STORE).get('current');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!values) return;
  for (const [name, value] of Object.entries(values)) {
    const field = publishForm.elements.namedItem(name);
    if (field) field.value = value;
  }
  editorSelection = { start: bodyField.value.length, end: bodyField.value.length };
  draftState.textContent = '已恢复上次未发布的草稿';
}

async function queueDraftSave() {
  const revision = ++draftRevision;
  draftState.textContent = '正在保存草稿…';
  try {
    await writeDraft(Object.fromEntries(new FormData(publishForm)));
    if (revision === draftRevision) draftState.textContent = '草稿已保存';
  } catch {
    if (revision === draftRevision) draftState.textContent = '草稿保存失败，请保留正文副本';
  }
}

async function clearDraft() {
  ++draftRevision;
  await writeDraft(null);
  publishForm.reset();
  editorSelection = { start: 0, end: 0 };
  resizeBody();
  draftState.textContent = '草稿已清除';
  setStatus(importStatus, '');
}

function resizeBody() {
  bodyField.style.height = 'auto';
  const limit = Math.floor(window.innerHeight * 0.65);
  bodyField.style.height = `${Math.min(Math.max(bodyField.scrollHeight, 320), limit)}px`;
  bodyField.style.overflowY = bodyField.scrollHeight > limit ? 'auto' : 'hidden';
}

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

async function uploadBase64(path, content, message) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return github(`/contents/${encodedPath}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content, branch: BRANCH })
  });
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
    if (!editorReady) {
      await restoreDraft().catch(() => { draftState.textContent = '当前浏览器无法恢复本地草稿'; });
      editorReady = true;
    }
    workspace.hidden = false;
    resizeBody();
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

function insertAtCursor(text) {
  bodyField.setRangeText(text, editorSelection.start, editorSelection.end, 'end');
  editorSelection = { start: bodyField.selectionStart, end: bodyField.selectionEnd };
  bodyField.focus();
  resizeBody();
  queueDraftSave();
}

async function uploadImage(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('单张图片不能超过 10 MB。');
  const data = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < data.length; offset += 0x8000) {
    binary += String.fromCharCode(...data.subarray(offset, offset + 0x8000));
  }
  const extension = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const filename = `${today()}-${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.${extension}`;
  const path = `${UPLOADS_PATH}/${filename}`;
  await uploadBase64(path, btoa(binary), `Upload image ${filename}`);
  return `/${path}`;
}

async function handleImageSelection(file) {
  publishForm.inert = true;
  setStatus(importStatus, '正在上传图片……');
  try {
    const imagePath = await uploadImage(file);
    insertAtCursor(`![${file.name.replace(/\.[^.]+$/, '').replace(/[\\\[\]]/g, '\\$&')}](${imagePath})`);
    setStatus(importStatus, '图片已上传并插入正文。', 'success');
  } catch (error) { setStatus(importStatus, error.message, 'error'); }
  finally { publishForm.inert = false; }
}

function loadLibrary(name, globalName) {
  if (window[globalName]) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('assets/' + name, import.meta.url);
    script.onload = resolve;
    script.onerror = () => { script.remove(); reject(new Error('Word 导入组件加载失败，请重试。')); };
    document.head.append(script);
  });
}

async function readWord(file) {
  await Promise.all([
    loadLibrary('mammoth.browser.min.js', 'mammoth'),
    loadLibrary('turndown.js', 'TurndownService'),
    loadLibrary('turndown-plugin-gfm.js', 'turndownPluginGfm')
  ]);
  let imageError;
  let uploads = Promise.resolve();
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
    convertImage: mammoth.images.imgElement(image => {
      // GitHub's Contents API requires writes to the same branch to run in sequence.
      uploads = uploads.then(async () => {
        const extension = image.contentType.split('/')[1].split('+')[0];
        const path = UPLOADS_PATH + '/' + today() + '-' + crypto.randomUUID() + '.' + extension;
        await uploadBase64(path, await image.read('base64'), 'Import image from ' + file.name);
        return { src: '/' + path };
      });
      return uploads.catch(error => { imageError = error; throw error; });
    })
  });
  if (imageError) throw imageError;
  const imported = new DOMParser().parseFromString(result.value, 'text/html');
  for (const table of imported.querySelectorAll('table')) {
    const row = table.rows[0];
    if (row && !table.tHead) table.createTHead().append(row);
  }
  const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  converter.use(turndownPluginGfm.gfm);
  converter.addRule('wordTableCell', {
    filter: ['th', 'td'],
    replacement: (content, cell) => (cell.cellIndex === 0 ? '| ' : ' ') +
      content.trim().replace(/\n+/g, '<br>').replace(/\|/g, '\\|') + ' |'
  });
  return converter.turndown(imported.body);
}

async function importDocument(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (!['docx', 'markdown', 'md', 'txt'].includes(extension)) {
    setStatus(importStatus, '请选择 Markdown、TXT 或 Word（.docx）文档。', 'error');
    return;
  }
  if (bodyField.value.trim() && !confirm('用导入的文档替换当前正文？')) return;
  publishForm.inert = true;
  setStatus(importStatus, '正在导入文档……');
  try {
    let markdown = extension === 'docx' ? await readWord(file) : await file.text();
    const metadata = {};
    const fields = extension !== 'txt' && markdown.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
    if (fields) {
      for (const match of fields[1].matchAll(/^(title|category|summary):[ \t]*(.+)$/gm)) {
        const value = match[2].trim();
        try { metadata[match[1]] = JSON.parse(value); }
        catch { metadata[match[1]] = value.replace(/^'(.*)'$/, '$1'); }
      }
      markdown = markdown.slice(fields[0].length);
    }
    const form = publishForm.elements;
    form.title.value = metadata.title || form.title.value || file.name.replace(/\.[^.]+$/, '');
    if (['learn', 'life'].includes(metadata.category)) form.category.value = metadata.category;
    if (typeof metadata.summary === 'string') form.summary.value = metadata.summary;
    bodyField.value = markdown;
    bodyField.setSelectionRange(markdown.length, markdown.length);
    rememberEditorSelection();
    resizeBody();
    await queueDraftSave();
    setStatus(importStatus, '文档已导入，可继续编辑。', 'success');
  } catch (error) { setStatus(importStatus, '导入失败：' + error.message, 'error'); }
  finally { publishForm.inert = false; }
}

publishForm.addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(publishForm));
  const filename = postFile(values.title);
  const path = `${POSTS_PATH}/${encodeURIComponent(filename)}`;
  const content = frontMatter(values);
  const submit = publishForm.querySelector('[type="submit"]');
  publishForm.inert = true;
  submit.disabled = true; setStatus(publishStatus, '正在发布……');
  try {
    await github(`/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message: `Publish post ${values.title}`, content: encodeBase64(content), branch: BRANCH }) });
    await clearDraft().catch(() => { draftState.textContent = '已发布，本地草稿清除失败'; });
    setStatus(publishStatus, `已发布 ${filename}，Pages 正在重新构建。`, 'success');
    await loadPosts();
  } catch (error) { setStatus(publishStatus, error.message, 'error'); }
  finally { publishForm.inert = false; submit.disabled = false; }
});

document.querySelector('#clear-draft').addEventListener('click', async () => {
  if (bodyField.value && !window.confirm('清空这篇未发布的草稿？')) return;
  publishForm.inert = true;
  try { await clearDraft(); }
  catch { draftState.textContent = '草稿清除失败'; }
  finally { publishForm.inert = false; }
});
document.querySelector('#refresh-posts').addEventListener('click', loadPosts);
connectButton.addEventListener('click', connect);
tokenInput.addEventListener('keydown', event => { if (event.key === 'Enter') connect(); });
publishForm.addEventListener('input', event => {
  if (!event.target.name) return;
  if (event.target === bodyField) { rememberEditorSelection(); resizeBody(); }
  queueDraftSave();
});
function rememberEditorSelection() {
  editorSelection = { start: bodyField.selectionStart, end: bodyField.selectionEnd };
}
for (const eventName of ['click', 'keyup', 'select', 'pointerup']) {
  bodyField.addEventListener(eventName, rememberEditorSelection);
}
document.addEventListener('selectionchange', () => {
  if (document.activeElement === bodyField) rememberEditorSelection();
});
bodyField.addEventListener('paste', () => setTimeout(() => { rememberEditorSelection(); resizeBody(); }, 0));
document.querySelector('label[for="image-file"]').addEventListener('pointerdown', rememberEditorSelection);
document.querySelector('label[for="image-file"]').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') rememberEditorSelection();
});
importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (file) importDocument(file);
  importFile.value = '';
});
imageFile.addEventListener('change', () => {
  const file = imageFile.files[0];
  if (file) handleImageSelection(file);
  imageFile.value = '';
});
window.addEventListener('resize', resizeBody);


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
  if (!workspace.hidden) resizeBody();
  panel.scrollIntoView();
}
window.addEventListener('hashchange', syncPanel);
syncPanel();
