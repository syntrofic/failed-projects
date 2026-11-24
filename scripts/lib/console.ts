/**
 * 控制台渲染层：面板、分组帮助、步骤与错误都经此处输出，查询与渲染分离。
 *
 * 契约（bun-mode-manager/references/console-output.md）：
 * - 非 TTY / NO_COLOR / FORCE_COLOR=0 只去色，标题、分隔线、缩进、对齐全部保留；
 * - 机器输出仅 --json，由调用方短路，本模块不参与；
 * - 对齐按显示列宽计算：ANSI 记 0 列，CJK/emoji 记 2 列。
 */

type Tone = 'green' | 'yellow' | 'red' | 'cyan' | 'dim';

const SGR: Record<'bold' | Tone, number> = {
  bold: 1,
  dim: 2,
  red: 31,
  green: 32,
  yellow: 33,
  cyan: 36,
};

export interface Paint {
  enabled: boolean;
  bold(s: string): string;
  dim(s: string): string;
  red(s: string): string;
  green(s: string): string;
  yellow(s: string): string;
  cyan(s: string): string;
}

export function colorEnabled(): boolean {
  const { env } = process;
  if (env.FORCE_COLOR === '0') return false;
  if (env.NO_COLOR !== undefined) return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '') return true;
  return Boolean(process.stdout.isTTY) && env.TERM !== 'dumb';
}

export function createPaint(enabled: boolean): Paint {
  const wrap = (code: number) => (s: string) => (enabled ? `\u001b[${code}m${s}\u001b[0m` : s);
  return {
    enabled,
    bold: wrap(SGR.bold),
    dim: wrap(SGR.dim),
    red: wrap(SGR.red),
    green: wrap(SGR.green),
    yellow: wrap(SGR.yellow),
    cyan: wrap(SGR.cyan),
  };
}

const ANSI_RE = /\u001b\[[0-9;]*m/g;

export const stripAnsi = (text: string) => text.replace(ANSI_RE, '');

function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f64f) ||
    (cp >= 0x1f900 && cp <= 0x1f9ff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

function charWidth(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f)) return 0;
  return isWide(cp) ? 2 : 1;
}

/** 终端显示列宽。 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of stripAnsi(text)) width += charWidth(ch);
  return width;
}

export function padTo(text: string, columns: number): string {
  const gap = columns - displayWidth(text);
  return gap > 0 ? text + ' '.repeat(gap) : text;
}

/** 中文行首禁则标点：不放在行首。 */
const NO_LINE_START = new Set([
  '，', '。', '、', '；', '：', '？', '！', '）', '》', '」', '』', '】', '〕', '…', '～', '·',
]);

/**
 * 按显示列宽折行，保留原有换行。
 * 分词规则：空格是首选断点；CJK/emoji 逐字可断；连续 ASCII 视为不可拆分的词，
 * 保证 URL、路径、命令在折行后仍可直接复制。
 */
export function wrap(text: string, columns: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    const tokens: string[] = [];
    let word = '';
    for (const ch of paragraph) {
      if (ch === ' ') {
        if (word !== '') tokens.push(word);
        word = '';
        tokens.push(' ');
        continue;
      }
      if (charWidth(ch) === 2) {
        if (word !== '') tokens.push(word);
        word = '';
        tokens.push(ch);
        continue;
      }
      word += ch;
    }
    if (word !== '') tokens.push(word);

    let line = '';
    let width = 0;
    const flush = () => {
      out.push(line.trimEnd());
      line = '';
      width = 0;
    };
    for (const token of tokens) {
      const w = displayWidth(token);
      if (token === ' ' && line === '') continue;
      // 行首禁则：中文标点不另起一行，跟随上一行（可能超出 1 列，观感优于标点悬挂）。
      const hanging = NO_LINE_START.has(token);
      if (width + w > columns && line.trimEnd() !== '' && !hanging) {
        flush();
        if (token === ' ') continue;
      }
      // 单词本身超过整行：独占一行，不拆开（拆开会破坏可复制性）。
      line += token;
      width += w;
    }
    flush();
  }
  return out.length > 0 ? out : [''];
}

/** 面板宽度：宽终端 78 列，普通终端留边，窄终端收窄。 */
export function panelWidth(): number {
  const columns = process.stdout.columns ?? 80;
  if (columns >= 82) return 78;
  if (columns >= 56) return columns - 2;
  return Math.max(28, columns - 1);
}

export interface Badge {
  text: string;
  tone: Tone;
}

export interface RowSpec {
  label: string;
  value: string;
  tone?: Tone | undefined;
}

export interface PanelSpec {
  title: string;
  badge?: Badge | undefined;
  sections: RowSpec[][];
  footer?: string | undefined;
}

const INDENT = 2;
const LABEL_WIDTH = 10;
const GUTTER = 2;
const VALUE_COLUMN = INDENT + LABEL_WIDTH + GUTTER;

export class Console {
  readonly paint: Paint;
  readonly width: number;

  constructor(paint = createPaint(colorEnabled()), width = panelWidth()) {
    this.paint = paint;
    this.width = width;
  }

  get rule(): string {
    return this.paint.dim('─'.repeat(this.width));
  }

  write(block: string): void {
    process.stdout.write(block.endsWith('\n') ? block : `${block}\n`);
  }

  private badgeText(badge: Badge): string {
    const symbol =
      badge.tone === 'green' ? '●' : badge.tone === 'yellow' ? '⚠' : badge.tone === 'red' ? '✗' : '○';
    const body = `${symbol} ${badge.text}`;
    return badge.tone === 'dim' ? this.paint.dim(body) : this.paint[badge.tone](body);
  }

  /** 标题行；右侧空位不足时状态另起一行，不挤压标题。 */
  head(title: string, badge?: Badge): string {
    const bold = this.paint.bold(title);
    if (!badge) return `${' '.repeat(INDENT)}${bold}`;
    const badgeText = this.badgeText(badge);
    const space = this.width - INDENT - displayWidth(title) - displayWidth(badgeText);
    if (space >= 2) return `${' '.repeat(INDENT)}${bold}${' '.repeat(space)}${badgeText}`;
    return `${' '.repeat(INDENT)}${bold}\n${' '.repeat(INDENT)}${badgeText}`;
  }

  /**
   * 标签/值两列。
   * 长路径与 URL 不折行（折行会毁掉可复制性），改为整行缩进输出；
   * 其余以空格分词的说明文字按可用列宽折行并对齐到值列。
   */
  row(spec: RowSpec): string {
    const label = this.paint.dim(padTo(spec.label, LABEL_WIDTH));
    const available = Math.max(16, this.width - VALUE_COLUMN);
    const paint = spec.tone ? this.paint[spec.tone] : (s: string) => s;
    const indent = ' '.repeat(VALUE_COLUMN);
    const chunks = wrap(spec.value, available);
    const first = chunks[0] ?? '';
    // 单词本身超过值列（长路径/URL）：另起一行缩进输出，保持完整可复制，
    // 而不是把标签与值挤在同一行导致越过面板边界。
    const head =
      displayWidth(first) > available
        ? `${' '.repeat(INDENT)}${label.trimEnd()}\n${indent}${paint(first)}`
        : `${' '.repeat(INDENT)}${label}${' '.repeat(GUTTER)}${paint(first)}`;
    const tail = chunks.slice(1).map((line) => `${indent}${paint(line)}`);
    return [head, ...tail].join('\n');
  }

  /** 顶部操作指引：青色，可复制。 */
  hint(text: string): string {
    const available = Math.max(16, this.width - INDENT);
    return wrap(text, available)
      .map((line) => `${' '.repeat(INDENT)}${this.paint.cyan(line)}`)
      .join('\n');
  }

  note(text: string): string {
    const available = Math.max(16, this.width - INDENT);
    return wrap(text, available)
      .map((line) => `${' '.repeat(INDENT)}${this.paint.dim(line)}`)
      .join('\n');
  }

  panel(spec: PanelSpec): string {
    const out = [this.rule, this.head(spec.title, spec.badge), this.rule];
    spec.sections.forEach((rows, index) => {
      if (index > 0) out.push('');
      for (const row of rows) out.push(this.row(row));
    });
    if (spec.footer) out.push(this.rule, this.hint(spec.footer));
    out.push(this.rule);
    return out.join('\n');
  }

  /** 过程步骤：`[1/3] 构建…`、`✓ 完成`、`⚠ 警告`、`✗ 失败`。 */
  steps(total: number) {
    let index = 0;
    const line = (text: string) => this.write(text);
    return {
      begin: (text: string) => {
        index += 1;
        line(`${this.paint.dim(`[${index}/${total}]`)} ${text}`);
      },
      ok: (text: string) => line(`      ${this.paint.green(`✓ ${text}`)}`),
      warn: (text: string) => line(`      ${this.paint.yellow(`⚠ ${text}`)}`),
      fail: (text: string) => line(`      ${this.paint.red(`✗ ${text}`)}`),
      detail: (text: string) => {
        for (const l of wrap(text, Math.max(16, this.width - 6))) line(`      ${this.paint.dim(l)}`);
      },
    };
  }
}

export interface HelpGroup {
  title: string;
  commands: { name: string; description: string }[];
}

export interface HelpSpec {
  title: string;
  usage: string;
  facts: RowSpec[];
  groups: HelpGroup[];
  examples: string[];
  notes: string[];
  footer?: string | undefined;
}

const COMMAND_COLUMN = 19;
const COMMAND_INDENT = INDENT + 2;

export function renderHelp(spec: HelpSpec, con = new Console()): string {
  const out = [con.rule, con.head(spec.title), con.rule, con.row({ label: '用法', value: spec.usage })];
  for (const fact of spec.facts) out.push(con.row(fact));

  for (const group of spec.groups) {
    out.push('', `${' '.repeat(INDENT)}${con.paint.bold(group.title)}`);
    for (const command of group.commands) {
      const name = con.paint.cyan(padTo(command.name, COMMAND_COLUMN));
      const available = Math.max(16, con.width - COMMAND_INDENT - COMMAND_COLUMN);
      const chunks = wrap(command.description, available);
      out.push(`${' '.repeat(COMMAND_INDENT)}${name}${chunks[0] ?? ''}`);
      for (const extra of chunks.slice(1)) {
        out.push(`${' '.repeat(COMMAND_INDENT + COMMAND_COLUMN)}${extra}`);
      }
    }
  }

  out.push('', `${' '.repeat(INDENT)}${con.paint.bold('常用操作')}`);
  for (const example of spec.examples) {
    for (const line of wrap(example, Math.max(16, con.width - INDENT))) {
      out.push(`${' '.repeat(INDENT)}${con.paint.cyan(line)}`);
    }
  }

  if (spec.notes.length > 0) {
    out.push('', `${' '.repeat(INDENT)}${con.paint.bold('说明')}`);
    for (const note of spec.notes) out.push(con.note(note));
  }

  if (spec.footer) out.push(con.rule, con.hint(spec.footer));
  out.push(con.rule);
  return out.join('\n');
}

export function renderFailure(title: string, body: string, hint?: string): string {
  const con = new Console();
  const out = [con.rule, con.head(title, { text: '失败', tone: 'red' }), con.rule];
  for (const line of wrap(body, Math.max(16, con.width - INDENT))) {
    out.push(`${' '.repeat(INDENT)}${con.paint.red(line)}`);
  }
  if (hint) out.push(con.rule, con.hint(hint));
  out.push(con.rule);
  return out.join('\n');
}
