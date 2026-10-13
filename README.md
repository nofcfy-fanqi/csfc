# CSFC 足球队网站

线上网站：[CSFC · 我们的主场](https://nofcfy-fanqi.github.io/csfc/)。

适用于 GitHub Pages 的静态网站，无需安装依赖或构建。包含响应式首页、队员名册、搜索、位置筛选、队员详情、分类相册与照片放大。

## 修改内容

编辑 `data.js`：

- `team.name`：球队名称。
- `team.tagline`：首页介绍，`\n` 表示换行。
- `team.demo`：替换真实名单后改为 `false`。
- `players`：名字 `name`、学号 `studentId`、印字 `jerseyName`、印号 `number`、位置 `position`、照片 `photo`。
- `albums`：标题 `title`、分类 `category`、照片 `photo`、描述 `description`。

队员位置使用“门将”“后卫”“中场”“前锋”。印号和学号写成字符串，以保留前导零。队员和相册数量可以自由增减。

把照片放在 `assets/photos/`，例如：

```js
{ name: "你的名字", studentId: "你的学号", jerseyName: "YOUR NAME", number: "07", position: "前锋", photo: "./assets/photos/player-07.jpg" }
```

相册分类使用“合影”“比赛”“训练”。`photo` 留空时展示占位。真实照片不需要 `sample: true`。目前所有成员资料均为示例，球场照片为氛围参考，并非球队活动照片。

GitHub Pages 上的内容是公开的，`data.js` 中的学号也可被读取。发布前请确认队员同意公开；不公开时可以直接把 `studentId` 改成打码内容（例如 `2026****01`）或 `未公开`，不要把完整学号留在文件中。

## 本地预览

在本目录运行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

浏览器打开 `http://127.0.0.1:8000`。也可以直接双击 `index.html`，页面没有依赖网络的脚本、字体或图片。

## 部署到 GitHub Pages

本项目的 GitHub 仓库为 `nofcfy-fanqi/csfc`，从 `master` 分支根目录发布。将修改推送到该分支后，GitHub Pages 会自动更新。

1. 在 GitHub 创建仓库并上传本目录的文件，确保 `index.html` 在根目录。
2. 打开仓库 **Settings → Pages**。
3. 选择 **Deploy from a branch**，选择存放网站的分支（通常是 `main`）和 **/(root)**，保存。
4. 发布成功后，可在 Pages 设置中查看网站链接。

普通仓库的网站地址为 `https://你的用户名.github.io/仓库名/`。若希望地址直接为 `https://你的用户名.github.io/`，仓库名称应为 `你的用户名.github.io`。

所有资源使用相对路径，支持根站点和带仓库名的项目站点。`.nojekyll` 告诉 GitHub Pages 直接提供静态文件。

参考：[GitHub Pages 发布源配置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[GitHub Pages 快速开始](https://docs.github.com/en/pages/quickstart)。

## 图片与标识

- `assets/stadium.jpg`：Unsplash 球场示例图片，来源 https://images.unsplash.com/photo-1522778119026-d647f0596c20 。可以替换为自己的球队照片，替换后同时修改首页照片的 `alt`、氛围示例说明和 `data.js` 中相册的说明。
- `assets/crest.svg`：此项目绘制的临时 CSFC 队徽。更名时可同步修改 SVG 中的文字，或替换为自己的标识。
- 队员无照片时展示按印字与印号生成的球衣示意图。

页面为展示网站，照片与成员信息通过文件维护；不含在线上传、数据库或后台管理。
