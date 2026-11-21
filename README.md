# cloverneo.com

amazing1102 的个人主页。GitHub Pages 从 main 分支的根目录构建 Jekyll，访客可以阅读文章、按栏目筛选和浏览项目。

## 写文章

在本机用浏览器打开 `writing.html`。填写标题、栏目、摘要和 Markdown 正文，展开预览后点击「导出 Markdown」。点击「上传到 GitHub」将导出的 .md 文件提交到 `_posts` 目录。Pages 构建后会自动更新首页和文章链接。草稿保存在当前浏览器，编辑台不随网站发布。

也可以直接在 [文章目录](https://github.com/amazing1102/amazing1102.github.io/tree/main/_posts) 中新增 `YYYY-MM-DD-slug.md`，参考已有文章的文件头。更新旧文时直接编辑原文件。栏目值为 `learn` 或 `life`。照片可上传到 `assets`，在正文用 Markdown 引用，如 `![照片的说明](/assets/photo.jpg)`。

## 管理文章

打开 `https://cloverneo.com/admin.html`，输入 GitHub Fine-grained Token 后，可以直接发布和删除文章。创建 Token 时只选择 `amazing1102/amazing1102.github.io` 这个仓库，并只授予 `Contents: Read and write` 权限。管理页使用 `noindex`，Token 只保存在当前浏览器标签页的 `sessionStorage`，关闭标签页后会清除。不要把 Token 写进文章、截图或提交到仓库。

## 改主页

首页简介和项目位于 `index.html`。布局位于 `_layouts`，公共样式位于 `styles.css`。资料头像取自 GitHub 账号 amazing1102，封面是 [Unsplash 工作桌照片](https://images.unsplash.com/photo-1497215728101-856f4ea42174)，均可替换为自己的图片。最初三篇文章是本站的开站文稿。

## 域名

`CNAME` 指向 cloverneo.com。在阿里云为主机记录 `@` 配置 GitHub Pages 的四条 A 记录。证书就绪后在仓库 Settings → Pages 勾选 Enforce HTTPS。[GitHub 官方说明](https://docs.github.com/zh/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
