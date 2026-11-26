# Syntrofic 官网

上海联觉律动科技有限公司的官网源码。前端使用 React 19、TypeScript 和官方 Astryx React 组件。后端使用 TypeScript 和 Node HTTP，可独立启动。前端在构建时从仓库读取内容并生成 HTML，部署时只需要静态托管。站内搜索直接查询这些内容的标题和摘要。

## 本地运行

需要 Node.js 22.18 或更高版本，以及 pnpm 11。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

如需检查后端，在另一个终端运行 `pnpm dev:backend`。默认监听 `127.0.0.1:3001`，可用环境变量 `HOST` 和 `PORT` 配置。`GET /healthz` 返回 `{"status":"ok"}`。

## 更新网站内容

在 [frontend/src/content.ts](frontend/src/content.ts) 编辑首页标题、导语、精选条目和关于页。标题可用 `\n` 控制换行。公益服务、开源项目、Blog 和产品都在同一个文件中，每个条目用独立的 `slug`、标题、摘要和正文段落表示。Blog 的 `date` 使用 `YYYY-MM-DD`。归档与首页动态都按日期倒序，首页显示最近三篇。需要对外链接时，给条目同时填写 `href` 和 `linkLabel`。

`slug` 使用小写英文字母、数字和连字符，发布后保留它即可保持原网址。当前内容与 Blog 日期用于版式预览。正文中的「内容草稿」标记在 [frontend/src/Interior.tsx](frontend/src/Interior.tsx) 内，正式文案就绪后可移除。

### 封面

在条目上添加可选的 `cover`。文件放进 `frontend/public/images/`，路径从 `/images/` 开始，宽高填写图片的原始像素尺寸。装饰图的 `alt` 可以留空。栏目上的 `cover` 用于首页入口，`site.aboutCover` 用于关于页。

```ts
cover: {
  src: '/images/example.webp',
  alt: '简短说明图中传达的信息',
  width: 1600,
  height: 900,
},
```

## 构建

```sh
pnpm typecheck
pnpm build
pnpm preview
```

- `pnpm build:frontend` 生成 `frontend/dist/`，包含首页、栏目、详情、关于与 `404.html`。静态托管时启用目录默认文档 `index.html`，将 404 错误文档指向 `404.html`。
- `pnpm build:backend` 生成 `backend/dist/`，使用 `pnpm start:backend` 启动。服务提供健康检查。

导航、按钮、卡片、轮播、折叠区、CommandPalette 搜索、正文、标题、面包屑和图标使用官方 `@astryxdesign/core@0.7.17`。官网参考 Astryx 官网的暖色首屏、蓝色字标、Figtree 字体、暖黑按钮与白色内容区。使用联觉律动字标、栏目封面与科研图。页面布局样式在 [frontend/src/site.css](frontend/src/site.css) 和 [frontend/src/interior.css](frontend/src/interior.css)。首页、Blog 和关于页参考了 [Anthropic 首页](https://www.anthropic.com/)、[新闻页](https://www.anthropic.com/news) 和 [公司页](https://www.anthropic.com/company) 的版式。


主题定义在 [frontend/src/theme/definition.ts](frontend/src/theme/definition.ts)。修改主题后用固定版本的 Astryx CLI 重新生成 CSS、JS 和类型声明。 [Astryx 官方主题](https://github.com/meta/astryx/blob/v0.7.17/apps/docsite/src/themes/astryxTheme.ts)

```sh
pnpm dlx @astryxdesign/cli@0.7.17 theme build frontend/src/theme/definition.ts --out frontend/src/theme/syntrofic.css
```

## 素材

`frontend/public/brand/` 收录联觉律动的单色字标与图形。栏目插图使用程序绘制的彩色曲线，存放于 [frontend/public/images/](frontend/public/images/)。首页的输运与扩散图由浏览器绘制，静态首帧和动画使用同一解析模型。绘图采用清晰的轴标、精简坐标轴和不同线型，图例保持简洁。 [figures4papers 绘图原则](https://github.com/ChenLiu-1996/figures4papers/blob/main/scientific-figure-making/references/design-theory.md)
