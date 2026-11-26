export type SectionSlug = 'public-interest' | 'open-source' | 'blog' | 'products';

export type Cover = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type Entry = {
  slug: string;
  title: string;
  summary: string;
  body: readonly string[];
  cover?: Cover;
  date?: string;
  href?: string;
  linkLabel?: string;
};

export type Section = {
  slug: SectionSlug;
  title: string;
  description: string;
  entries: readonly Entry[];
  cover?: Cover;
};

const portrait = { alt: '', width: 640, height: 800 };
// 条目可使用独立封面，并为传达额外信息的图片填写 alt。
const placeholderCovers = {
  publicInterest: { ...portrait, src: '/images/flow-public-interest.webp' },
  openSource: { ...portrait, src: '/images/flow-open-source.webp' },
  blog: { ...portrait, src: '/images/flow-blog.webp' },
  products: { ...portrait, src: '/images/flow-products.webp' },
  featured: { src: '/images/flow-feature.webp', alt: '', width: 1600, height: 900 },
} satisfies Record<string, Cover>;

// 首页和关于页占位文案。发布前请替换为正式内容。
export const site: {
  name: string;
  companyName: string;
  description: string;
  headline: string;
  intro: string;
  about: readonly string[];
  aboutCover?: Cover;
  featured: { section: SectionSlug; entry: string };
} = {
  name: 'Syntrofic',
  companyName: '上海联觉律动科技有限公司',
  description: '联觉律动的公益服务、开源项目、Blog 和产品。',
  headline: '为研究与创造\n打造更好的工具。',
  intro: '我们关注科研和创作中反复遇到的问题，尝试把解决办法做成易于使用、可以复用的工具。',
  about: [
    'Syntrofic（联觉律动）关注科研、开发与创作中的实际工作。我们从具体任务出发，探索工具怎样融入人们已有的工作方式。',
    '公益服务面向日常需求，开源项目分享可复用的工具和实现，产品探索完整的工作流程。我们也在 Blog 记录其中的设计与开发。',
  ],
  aboutCover: placeholderCovers.featured,
  featured: { section: 'open-source', entry: 'syntrofic-ui' },
};

// 各栏目的条目均为样稿。Blog 日期用于展示文章列表，可与正文一起替换。
export const sections: readonly Section[] = [
  {
    slug: 'public-interest',
    title: '公益服务',
    cover: placeholderCovers.publicInterest,
    description: '从写文档和分享图片开始，探索可以开放给公众的日常工具。',
    entries: [
      {
        slug: 'markdown-collaboration',
        title: '在线 Markdown 协作',
        summary: '让几个人在同一个地方写会议记录、项目说明或文章草稿。',
        cover: placeholderCovers.publicInterest,
        body: [
          '这项工具从共同维护一份文档的场景出发。团队可以在会前准备议题，开会时一起补充记录，会后继续更新。',
          '服务准备开放时，这里会附上使用方式和体验入口。',
        ],
      },
      {
        slug: 'image-hosting',
        title: '免费图床',
        summary: '为文章、笔记和项目文档提供可以直接引用的图片链接。',
        cover: placeholderCovers.products,
        body: [
          '这项服务围绕一个简单流程设计：上传图片、复制链接，再把图片引用到文章或项目文档中。',
          '服务准备开放时，这里会说明图片规格、用量和使用方式。',
        ],
      },
    ],
  },
  {
    slug: 'open-source',
    title: '开源项目',
    cover: placeholderCovers.openSource,
    description: '分享可以独立使用的组件和工具，以及帮助你运行、理解和改进它们的文档。',
    entries: [
      {
        slug: 'syntrofic-ui',
        title: 'Syntrofic UI',
        summary: 'Astryx Design System 的 Vue 3 移植，面向使用 Vue 构建界面的开发者。',
        cover: placeholderCovers.featured,
        body: [
          'Syntrofic UI 将 Astryx 的组件与主题移植到 Vue 3，并沿用官方组件的接口和视觉令牌。',
          '项目文档将说明组件用法、主题接入方式及兼容范围。',
        ],
      },
      {
        slug: 'research-workflow-tools',
        title: '科研工作流工具',
        summary: '围绕论文阅读等独立任务，探索可复用的开源工具。',
        cover: placeholderCovers.openSource,
        body: [
          '以论文阅读为例，工具可以围绕导入资料、组织笔记和回到原文核对这几步设计。',
          '每项工具都会在适合独立发布时补充运行示例和使用说明。',
        ],
      },
    ],
  },
  {
    slug: 'blog',
    title: 'Blog',
    cover: placeholderCovers.blog,
    description: '记录我们如何设计和开发工具，以及项目推进中的具体问题。',
    entries: [
      {
        slug: 'reusable-research-workflows',
        title: '如何让一项研究任务可以复用',
        summary: '以论文阅读为例，想清楚工具从哪里收集资料、在哪一步需要回到原文。',
        date: '2026-11-26',
        cover: placeholderCovers.blog,
        body: [
          '把一项研究任务交给别人之前，可以先写下所需资料、处理步骤和检查结果的方法。',
          '正文可以从一个具体的论文阅读任务开始，展示这三个环节如何连在一起。',
        ],
      },
      {
        slug: 'open-source-quickstart',
        title: '开源文档怎样帮助第一次运行',
        summary: '从安装、运行示例到核对结果，梳理项目第一次被别人使用的过程。',
        date: '2026-11-20',
        cover: placeholderCovers.openSource,
        body: [
          '一份快速开始指南应该告诉使用者需要准备什么、怎样运行一个示例，以及如何判断它是否成功。',
          '正文可以用一个可重复的例子，说明运行要求、预期输出和反馈途径。',
        ],
      },
      {
        slug: 'starting-with-a-small-public-tool',
        title: '公益工具从一个小需求开始',
        summary: '以共同维护一份记录为例，梳理公开工具可以解决的具体问题。',
        date: '2026-11-14',
        cover: placeholderCovers.publicInterest,
        body: [
          '会议记录、活动说明和项目文档都需要几个人持续更新同一份内容。',
          '正文可以从准备、共享和修改这几个环节展开，记录哪些步骤适合由工具承担。',
        ],
      },
    ],
  },
  {
    slug: 'products',
    title: '产品',
    cover: placeholderCovers.products,
    description: '围绕具体的工作和创作场景，探索完整的产品体验。',
    entries: [
      {
        slug: 'gallery',
        title: 'Gallery',
        summary: '一项关于个人自托管画廊的产品探索。',
        cover: placeholderCovers.products,
        body: [
          'Gallery 围绕个人照片与图像作品的整理和展示展开。',
          '这里预留产品介绍、画廊示例与使用入口。',
        ],
      },
      {
        slug: 'ai4science',
        title: 'ai4science',
        summary: '从论文资料的整理与核对出发，探索如何支持研究工作。',
        cover: placeholderCovers.blog,
        body: [
          'ai4science 关注研究者如何组织资料、记录阅读过程和查找原文。',
          '这里预留正式的产品介绍和工作流程示例。',
        ],
      },
    ],
  },
];
