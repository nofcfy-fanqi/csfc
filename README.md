# CSFC · 有密码的球队主场

网站：https://nofcfy-fanqi.github.io/csfc/

GitHub Pages 提供全部发布文件。访客在自己的浏览器输入密码，解密完整网页、名单和照片。维护者电脑关机不影响网站访问。

## 公开仓库

- `index.html`、`gate.css`、`gate.js`：密码入口与浏览器解密代码。
- `site.enc.json`：加密后的完整网站，包括原始网页、样式、功能代码、名单和照片。
- `assets/crest.svg`：公开队徽，无队员资料。
- `scripts/`：通用打包、加密、恢复与预览工具，无访问密码。

公开文件不含密码、解密密钥、原始名单和受保护照片。原稿和密码放在被 Git 忽略的 `.private-source/`，不会提交上传。

保护开始前的示例名单及示例球场照片已经公开，仍能从旧的 Git 历史读取。本次未改写历史，不能收回以前公开的内容。目前没有真实队员资料；以后真实内容应在私有原稿中修改，加密后再上传。

## 修改资料

在维护者电脑编辑 `.private-source/site/data.js`。字段：`name` 名字、`studentId` 学号、`jerseyName` 印字、`number` 印号、`position` 位置、`photo` 照片。

照片放在 `.private-source/site/assets/photos/`，路径例如 `./assets/photos/player-07.jpg`。程序会把所有图片一起加密，并拒绝外部图片链接。网页、样式和功能代码保存在 `.private-source/site/`。

更新后运行：

```sh
node scripts/build-protected.mjs
```

提交新的 `site.enc.json` 和公开入口文件，推送到 `master`，GitHub Pages 自动更新。不要强行提交 `.private-source/`，不要把密码或未加密的原稿上传公开仓库。

## 访问密码

首次构建生成随机长密码，存于被忽略的 `.private-source/access-password.txt`（文件权限 600，仅本地）。密码不写入公开文件。

编辑该本地文件后重新构建可以修改密码；自动生成新密码可运行：

```sh
node scripts/build-protected.mjs --rotate-password
```

公开密文可下载，因此保留较长的随机密码。改密码只保护新版本；拥有旧密码和旧密文的人仍能解密旧内容。知道密码的访客可以保存或分享解密后资料，此方案不能阻止截图或转发。

应用不向浏览器 localStorage、sessionStorage、IndexedDB 或缓存存储写入密码、密钥和解密内容。刷新或点击“锁定网站”后，需要重新输入密码。密码管理器是否保存密码由访客自行选择。

## 换电脑恢复

加密文件包含全部原稿，云端文件足够恢复。没有密码则无法恢复，请保管好密码。

在新电脑克隆仓库，创建 `.private-source/access-password.txt` 并写入已有密码，运行：

```sh
node scripts/build-protected.mjs --recover
```

原稿会恢复到 `.private-source/site/`，不覆盖已有文件，不上传明文资料。

## 检查与预览

```sh
node --test tests/protection.test.mjs
python3 scripts/preview.py
```

打开 `http://127.0.0.1:8000`。预览服务器只提供公开文件，拒绝访问原稿、密码、Git 元数据与其他路径。线上使用 GitHub Pages 的 HTTPS 地址，不需要本地服务器。

## 加密方式

AES-256-GCM，128 位认证标签，每次随机 16 字节盐、12 字节 IV，PBKDF2-HMAC-SHA256 600,000 次迭代。图片解密后使用内存 Blob URL 显示。

参考：[Web Crypto AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)、[PBKDF2 派生密钥](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey)。

初版球场氛围图来自 Unsplash `photo-1522778119026-d647f0596c20`，并非球队比赛照片。临时 CSFC 队徽与球衣示意图为项目绘制。
