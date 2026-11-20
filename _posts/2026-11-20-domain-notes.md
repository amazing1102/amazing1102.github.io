---
title: 从一个域名到一个网页
summary: 顺着 cloverneo.com 的访问路径，认识域名解析、GitHub Pages 和 HTTPS。
category: learn
date: 2026-11-20 07:00:00 +0800
---
在浏览器里输入域名时，会有几个不同的服务一起工作。

1. **DNS 负责找到地址。** 根域名的 A 记录告诉浏览器应该连接哪些 IPv4 地址。阿里云的解析面板里，用 `@` 表示根域名。
2. **GitHub Pages 负责返回网页。** 仓库里的 Markdown 经过构建变成 HTML。访问者可以直接打开每篇文章的固定链接。
3. **HTTPS 负责加密连接和验证站点身份。** 当域名解析正确，Pages 才能为自定义域名申请证书。

具体的记录值可以随时对照 [GitHub 的自定义域名文档](https://docs.github.com/zh/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。
