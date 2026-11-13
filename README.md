# EXO 星球 · exolneverland.com

一个 EXO 粉丝向的静态站点：今日刊、成员专栏、行程与订阅日历、L 卡生成、来时路、专辑与获奖。

## 本地预览

```
cd site && python3 -m http.server 8766
```

然后打开 http://127.0.0.1:8766/

## 结构

- `site/`：网站文件，部署时只上传这个目录。
- `data/`：成员、行程、专辑等数据。改动后运行 `node tools/build.mjs` 重新生成。
- `tools/`：构建、字体和分享图脚本。
- `worker/`：每小时抓取新闻的 Cloudflare Worker（可选，不部署也能用，首页的「快讯」栏会自动隐藏）。

## 版权说明

网站中的成员照片版权属于 SM Entertainment，仅用于粉丝向展示，请勿商用。

## 获取源码

下载并解压 `exo-site-source.zip`，其中包含 `site/`、`data/`、`tools/` 和 `worker/`。
