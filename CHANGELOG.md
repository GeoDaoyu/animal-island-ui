# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-10-03

### Added

- `Badge` 角标组件：数字 / 字符串 / 任意 ReactNode（含 `naive-icons` 图标）三种内容形态，`overflowCount` 封顶后显示为 `${count}+`（仅纯数字参与换算），`dot` 只展示小圆点，`showZero` 控制数值为 0 时是否展示；`size`（`small` / `medium`）与 12 色 `color` 调色板与 `Card` / `Tag` 保持一致；**内容 ≤ 2 字符时自动渲染为正圆**并同步收窄字号，`100` / `99+` / `999+` 及「热更」等超宽内容自动回退为胶囊；不传 `children` 时可作为独立徽标使用

### Changed

- `Progress` 改为**描边岛屿**样式：轨道加 2px 描边，填充换成带内高光的薄荷渐变，100% 完成态有独立配色；轨道纹理保留原有手作纸质感，`size` 契约不变（改为含描边总高），`variant` 场景图路径不受影响
- `Input` 背景色统一为 `#fffdf7`，与仓库既有奶油色板对齐（与 `Upload` / `Select` / `DatePicker` 弹层同色），并修正文档中与实现不一致的旧色值
- 场景图 URL 抽到独立的 `sceneImages` 模块，`Background` 与 `Progress` 共用，消除重复

### Fixed

- `Badge` 数值为空字符串时不再渲染空角标
- `Form` 校验失败标记此前是裸 `✕` 字符，现改用 `naive-icons` 的 `CloseIcon`，与「图标必须来自 `naive-icons`」的设计硬规则一致
- 移除源码中的裸 Unicode 符号（`✕`、制表符字符），全部迁移至图标或转义写法

## [2.1.0] - 2026-10-02

### Added

- `Rate` 星级评分组件：受控（`value` / `onChange`）与非受控（`defaultValue`）两种用法，`count` 星星总数、`size` 尺寸、`readonly` 只读、`allowClear` 再次点击同一颗星清空评分（默认开启，清空时回调值为 `0`）；完整键盘操作（方向键移动、`Enter` / `Space` 确认，焦点与读屏均可用）；连续点击时星星按提交顺序逐颗点亮，动画重放而非跳过

- `Avatar` 头像组件：图片 / 图标 / 文字三种形态，圆形 / 方形两种形状，三档预设尺寸（32 / 40 / 48px）与任意数值尺寸；`gap` 控制内边距并对超长文字自动缩放；图片加载失败自动回退到图标或文字。`Avatar.Group` 支持 `gap` 控制的头像叠加与 `maxCount` 超出折叠为「+N」，组级 `size` / `shape` 会注入未自行设置的子项，同时提供 `Avatar.Group` 静态属性写法
- `Avatar` 的 a11y：图片头像透传 `alt`，裸图标头像带 `role="img"` + `aria-label="avatar"`，并新增 2 条 axe 冒烟用例

### Fixed

- Skill 组件目录回填此前漏登记的 `Upload` / `Pagination` / `Loading` / `Time`，英文 `SKILL.md` 补齐 Layout 与 Feedback 分类；`AGENTS.md` 组件数由 30 更正为 37
- Skill props 参考按 200 行上限拆分：新建 `media.md`（Image / Avatar / Carousel），`layout.md`（199 → 154）与 `data-display.md`（196 → 124）回到上限以内
- Demo Skill 页图标恢复渲染：`resolveIcon` 用 `typeof === 'function'` 判断组件，而 `naive-icons` 导出的是 `ForwardRefExoticComponent`（运行时为对象），此前 10 个图标全部解析失败；页面数据同步至 37 个组件
- `Avatar.Group` 静态属性此前被 `as unknown as` 强转从公开类型中抹去，现已在 `AvatarProps` 导出处声明

### Internal

- `tsc --noEmit` 接入 `ci`：`npm run test:run` 现在串联 a11y 配置（此前混合 filter 时 `test/a11y.test.tsx` 会被静默跳过并仍报绿）
- 清理 44 个累积的类型错误，其中 33 个源于 tsconfig `lib` 缺少 ES2022（`Array.prototype.at`）

## [2.0.0] - 2026-09-24

### Changed

- **许可证由 CC BY-NC 4.0 变更为 MIT**：移除非商业使用限制，允许用户自由用于个人及商业用途
- **`naive-icons` 升级至 `1.2.0`**：新增 9 个图标，并修复组件改为 `forwardRef` 后图标不渲染的问题
- `Progress` 的 `variant` 改为可选项：不传时使用纯色填充，传时显示场景图

### Added

- `Upload` 上传组件：text / picture-card 两种列表形态，点击与拖拽触发，`beforeUpload` 拦截、`maxCount`、`customRequest` / `action` 真实上传，内置预览灯箱

## [1.13.0] - 2026-09-16

### Changed

- **图标迁移至 `naive-icons`**（破坏性变更）：内置 `Icon` 组件与 101 个私有图标移除，库改用独立的 [naive-icons](https://github.com/guokaigdg/naive-icons) 图标包；`naive-icons` 成为唯一运行时依赖，`Icon` 相关 API 迁移至该包
- `Divider` 的 `icon` prop 由图标名改为接收 React 图标元素（如 `<FishIcon />`）
- `Button` / `Collapse` / `Image` 内置装饰图标迁移至 `naive-icons`
- `naive-icons` 升级至 `1.1.0`：新增 15 个图标（箭头、折叠、复制、菜单、外链等），Demo Icon 页同步适配并补齐中文名
- `naive-icons` 升级至 `1.2.0`：新增 9 个图标（篮球、哑铃、谷歌浏览器、山、帐篷、暂停、停止、咖啡杯、水杯），修复主页与 Icon 页因组件改为 `forwardRef` 导致的图标不渲染问题
- `Title` 默认变体由 `layer` 改为 `ribbon`（飘带、默认）

### Added

- `Footer` 由图标链重构为版权栏：渲染 `© {year} {text}`，年份动态获取，文案默认 `All Rights Reserved.`，支持 `text` / `year` / `className` / `style` 自定义
- Demo Icon 页展示全部 `naive-icons` 图标及 npm / yarn / pnpm 安装说明
- Demo 首页与侧边栏改用 GROBOLD 展示字体

## [1.11.0] - 2026-09-11

### Added

- `Background` 组件扩展为 16 种图案类型（含 `grid`、`sprinkles` 及 13 种 `dots-*`）
- 工具链：ESLint flat config + CI workflow + EditorConfig

### Changed

- `Divider` 移除锯齿线 `line-*` 变体，仅保留虚线 `dashed-*`（破坏性变更）
- `Icon` 组件改用内置可爱图标集（101 个），`name` 支持帕斯卡命名（如 `<Icon name="HeartIcon" />`），并移除 `lucide-react` 运行时依赖（运行时依赖归零）；库根同时导出全部 101 个图标组件
- `DatePicker` 翻页箭头由 lucide 迁移为内联 SVG
- `Collapse` 展开装饰 SVG 改用 `Fish` 图标
- `Input` / `Table` 样式细节优化

### Removed

- `Divider` 移除 `line-*` 变体（破坏性变更）

## [1.9.0] - 2026-09-04

### Removed

- 移除 `Phone`、`Wallet`、`Time`、`Loading`、`WeddingInvitation` 组件（版权整改，详见 README）
- 移除 `Icon` 组件内置位图图标，改用 [lucide-react](https://lucide.dev/icons/) 矢量图标
- 移除 `BackTop` 内置位图素材，改为原创 SVG 徽章
- 移除 `Divider` 位图锯齿线素材，改为纯 CSS 渐变实现
- 移除全部内嵌 base64 图片与外部图片引用，仓库现零图片文件

### Changed

- **版权整改版本**：全 git 历史重写（git-filter-repo），删除全部第三方版权素材
- `Icon` 组件新增 `icon` prop，支持传入任意 lucide 图标组件
- `DatePicker` 翻页箭头、`Phone`（已移除）状态栏等图标全面迁移至 lucide
- README 与文档同步清理，移除案例展示章节

### Security

- 建议所有用户从 1.8.0 及以下版本升级至 1.9.0+

## [1.0.1] - 2026-06-09

### Fixed

- `vite.config.ts`：`assetInfo.name` → `assetInfo.names`（对齐 Rollup 弃用 API）
- `vite.config.ts`：修复 Vite 7 `assetFileNames` 多 output 一致性校验
- `vite.config.ts`：CSS 产物 `build.lib.cssFileName` 命名规范化
- `package.json`：`classnames` 移出 `dependencies`、改入 `peerDependencies`
- Icon 组件：488 个 PNG 由静态 import 改为动态懒加载

### Changed

- 字体加载策略调整
- 图片格式优化：`.png` → `.webp` / `.jpg`
- 移除 CSS 内联的 base64 图片

## [1.0.0] - 2026-XX-XX

### Added

- 首次正式发布 1.0.0 版本

## [0.9.x]

历史版本 0.9.0 ~ 0.9.8 因版权整改已从发布渠道移除，升级请直接使用 1.9.0+
