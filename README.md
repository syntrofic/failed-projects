# portal-website

Syntrofic（上海联觉律动科技有限公司）官方网站。

技术栈：Vite 8 + React 19 + TypeScript 7 + Tailwind CSS v4 + shadcn/ui（Radix 版）+ react-router。

## 页面

| 路由 | 内容 |
|---|---|
| `/` | 首页：Hero、信任条、核心能力、终端演示、CTA |
| `/products` | 产品：功能矩阵、定价、联系销售 |
| `/about` | 关于：公司介绍、价值观、历程 |
| `/blog` | 博客占位（文章列表） |
| `*` | 404 |

## 结构

```
src/
  components/ui/     # shadcn 生成的组件（button/card/badge/…）
  components/site/   # 站点级组件（site-layout/reveal/section）
  pages/             # 路由页面
  lib/utils.ts       # cn() 等工具
```

- 动效：无第三方动画库，`Reveal` 组件用 IntersectionObserver + CSS transition 做滚动显现，尊重 `prefers-reduced-motion`。
- 主题：设计 token 在 `src/styles.css`（Tailwind v4 `@theme`），品牌主色 `--primary`，暗色模式通过 `.dark` 类切换。
- 字体：Geist Variable（自托管 `@fontsource-variable`）+ 系统中文回退。

## 快速开始

```bash
bun install
bun run mode:start     # 启动本地开发服务器（默认 HTTP，HMR 开启）
```

`mode:start` 会创建 `.local/mode.json`、派生端口、拉起 Vite 并等待健康检查，然后打印状态面板，其中包含本机与局域网访问地址。

## 命令

| 命令 | 用途 |
|---|---|
| `bun run mode:start` | 启动开发服务器；已在运行则复用并回到面板 |
| `bun run mode:stop` | 停止受管进程，保留日志与配置 |
| `bun run mode:reload` | 应用最新代码：源码改动走 HMR；`vite.config.ts` / 依赖清单变更则重启 |
| `bun run mode:restart` | 重启现有进程，不重新构建、不清理缓存 |
| `bun run mode:status` | 状态面板：访问地址、健康、证书策略、资源占用、诊断路径 |
| `bun run mode:health` | 健康探测；失败退出码为 1（`--json` 供自动化） |
| `bun run mode:logs` | 跟踪 `.local/run/logs/dev.log`，Ctrl+C 退出 |
| `bun run mode:build` | 生产构建到 `dist/`（`tsc --noEmit` + `vite build`） |
| `bun run mode:clean` | 预览并回收可重建产物；`--dry-run` 只预览 |
| `bun run mode:help` | 分组帮助 |

机器输出统一用显式 `--json`：

```bash
bun run mode:status -- --json
bun run mode:health -- --json
```

`bun run` 会回显命令并把参数交给脚本，`--` 之后的参数才会传给管理器。

## TLS 归外围设施

仓库**不**生成、不加载任何证书：本地与服务端都由外围网关（反向代理 / CDN / 负载均衡）终止 TLS 并持有证书。应用只监听 HTTP，`mode:status` 里 `TLS` 一行固定标注该事实，不会静默降级。

生产发布：`bun run mode:build`，把 `dist/` 交给提供域名的静态服务或网关即可。

## 本地配置与状态

- `.local/mode.json`：唯一用户配置来源，已被 Git 忽略。字段包括 `bindHost`、`portRange`、`storage`（水位、缓存预算、闲置期限、日志上限）。损坏或版本不支持时报错，不静默重置。
- `.local/run/`：运行状态，含 `state.json`（PID + 进程创建时间 + argv，用于归属核验）、`logs/`、锁目录、`last-clean.json`、`runtime.json`。目录 0700，文件 0600。

端口由仓库真实路径派生基线（`24000` 起 400 个），冲突时有界顺延并记录实际端口；不会杀掉占用者。

## 磁盘与日志

- 水位：75% / 85% / 92% 触发，70% / 78% / 85% 退出（滞回，避免抖动）。
- 只回收可核验归属的可重建目录：`dist/`、`node_modules/.vite`。源码、配置、`.local`、依赖目录永不在自动清理范围。
- 清理只在构建前与成功构建后执行；没有定时任务，闲置项目不会自行回收。
- `dev.log` 按 10 MiB 轮转，保留 3 份（`dev.log` + `dev.log.1` + `dev.log.2`）。

## 类型检查

```bash
bun run typecheck
```
