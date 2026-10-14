# CSFC · 男队与女队主场

网站：https://nofcfy-fanqi.github.io/csfc/

入口分为男队和女队，分别输入对应的访问密码。两队使用相同的页面格式，各自拥有独立的名单、照片和加密文件。GitHub Pages 提供全部发布文件，维护者电脑关机不影响访问。

## 两队独立的文件

| 球队 | 云端加密文件 | 本地原稿 | 本地密码文件 |
| --- | --- | --- | --- |
| 男队 | `men.enc.json` | `.private-source/men/site/` | `.private-source/men/access-password.txt` |
| 女队 | `women.enc.json` | `.private-source/women/site/` | `.private-source/women/access-password.txt` |

`index.html`、`gate.css`、`gate.js` 是公开入口与解密代码。队徽公开，原始名单和照片全部在密文里。公开仓库没有访问密码或解密密钥；原稿和密码属于被 Git 忽略的 `.private-source/`。

男队密码只能解锁男队，女队密码只能解锁女队。旧的统一入口已停用。入口切换球队时清空密码，不自动尝试另一队；解锁后的“切换球队”返回密码入口，重新选择并验证。

当前两队名单均为示例资料，不代表真实球队成员。

## 修改名单和照片

编辑对应球队目录中的 `data.js`，字段为 `name` 名字、`studentId` 学号、`jerseyName` 印字、`number` 印号、`position` 位置、`photo` 照片。`team.division` 保持为“男队”或“女队”。

照片放在对应目录的 `site/assets/photos/`，路径写成 `./assets/photos/player-07.jpg`。打包程序会把该队全部照片一起加密，并拒绝外部图片链接。

更新两队：

```sh
node scripts/build-protected.mjs
```

只更新其中一队：

```sh
node scripts/build-protected.mjs --team men
node scripts/build-protected.mjs --team women
```

提交生成的公开文件，推送到 `master`，GitHub Pages 自动更新。不要把原稿或密码上传公开仓库，不要强行提交 `.private-source/`。

## 密码维护

编辑对应的本地 `access-password.txt` 后重新构建。访问密码不写入公开源代码。也可以生成新的随机长密码：

```sh
node scripts/build-protected.mjs --team men --rotate-password
node scripts/build-protected.mjs --team women --rotate-password
```

当前共享密码由网站维护者选择。包含球队名称和年份的密码比随机长密码更容易被猜到。密文可公开下载并离线猜测密码，此方案没有服务器端的尝试次数限制。

应用不把密码、密钥或解密内容写入浏览器存储。刷新、切换球队后需要重新输入密码；密码管理器是否保存由访客自行选择。知道密码的人能保存解密后内容，不能阻止转发或截图。

换密码只保护新的发布版本。拥有旧密码和旧密文的人仍能解密旧版本，已经公开的历史资料无法通过后来加密收回。初版演示名单、示例球场图及旧加密版本仍保留在仓库历史中；未来真实资料应只在私有原稿里修改并加密发布。

## 换电脑恢复

GitHub 上的两份密文包含两队各自的全部原稿。克隆仓库，在对应的本地密码文件填入已有密码，再运行：

```sh
node scripts/build-protected.mjs --team men --recover
node scripts/build-protected.mjs --team women --recover
```

可以只恢复自己知道密码的一队。恢复程序不会覆盖现有文件，不会上传原稿。

## 检查与预览

```sh
node --test tests/protection.test.mjs
python3 scripts/preview.py
```

本地预览 `http://127.0.0.1:8000` 只提供公开文件，拒绝访问密码、原稿和 Git 元数据。

两队可直接分享入口：

- 男队：https://nofcfy-fanqi.github.io/csfc/?team=men
- 女队：https://nofcfy-fanqi.github.io/csfc/?team=women

## 实现

AES-256-GCM，128 位认证标签，随机 16 字节盐和 12 字节 IV，PBKDF2-HMAC-SHA256 600,000 次迭代。每队单独加密，浏览器只下载当前所选球队的密文。密码正确后解密网页和照片，图片使用内存 Blob URL 显示。

参考：[Web Crypto AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)、[PBKDF2 派生密钥](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey)。初版球场示例照片来自 Unsplash，标识及球衣示意为项目绘制。
