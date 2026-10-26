# 图提取 ImageGrab

一款 Chrome 浏览器扩展：在淘宝、天猫、京东、拼多多商家版的商品详情页，一键提取所有商品图片，集中勾选后批量下载为 PNG。

## 功能

- 右下角悬浮「获取图片」按钮，仅在电商详情页显示
- 自动扫描 `<img>`、`srcset`、懒加载属性、`background-image`
- 智能过滤图标 / logo / 占位图 / 1×1 像素图
- 新标签页网格预览，支持全选 / 反选 / 单张勾选
- jpg / webp 自动通过 canvas 重编码为 PNG
- 文件名自动按 `商品图_001.png` 编号

## 目录结构

```
imagegrab/
├── manifest.json        # MV3 清单
├── content.js           # 注入按钮 + 提取图片
├── content.css          # 按钮样式
├── background.js       # Service Worker：存图、跨域抓图、下载
├── gallery.html/.js/.css# 图片画廊页
├── icons/               # 插件图标
└── docs/                # 官方宣传静态网站（GitHub Pages 部署）
    ├── index.html
    ├── css/style.css
    └── js/main.js
```

## 安装方法（开发者模式加载）

1. 打开 Chrome，地址栏输入 `chrome://extensions` 回车
2. 右上角打开「开发者模式」
3. 点击左上角「加载已解压的扩展程序」，选择本 `imagegrab` 文件夹
4. 打开任意淘宝 / 天猫 / 京东 / 拼多多商品详情页，右下角即可看到「获取图片」按钮

## 使用方法

1. 在商品详情页点击右下角「获取图片」
2. 自动打开画廊页，展示提取到的所有图片
3. 勾选需要的图片（或点全选 / 反选）
4. 点击「下载选中」，自动保存为 PNG 到浏览器默认下载目录

## 本地预览官网

直接双击 `docs/index.html` 即可在浏览器中查看，无需任何构建工具。

## 技术说明

- Manifest V3，纯原生 HTML/CSS/JS，无任何框架与依赖
- 跨域图片由 background service worker fetch 为 dataURL，避免 canvas 被污染
- 支持平台域名：`*.taobao.com`、`*.tmall.com`、`*.jd.com`、`*.pinduoduo.com`、`*.yangkeduo.com`

> 仅供学习交流使用，请勿用于爬取受版权保护的素材。
