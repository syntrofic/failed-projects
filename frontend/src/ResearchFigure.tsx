import {useEffect, useId, useRef, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';

const traces = [
  {label: 'τ', offset: 0, color: '#3e6384', dash: []},
  {label: 'τ + 0.5', offset: 0.5, color: '#77678e', dash: [7, 3]},
  {label: 'τ + 1.0', offset: 1, color: '#5b7d70', dash: [2, 3]},
  {label: 'τ + 1.5', offset: 1.5, color: '#667688', dash: [8, 3, 2, 3]},
];

const cycleDuration = 7500;
const plotDescription = '一维输运与扩散的数学示意图。四条曲线表示间隔相同的时刻，浓度峰值向右移动，曲线变宽，峰值降低。';

function concentrationAt(position: number, time: number) {
  // The dimensionless Gaussian keeps constant area as its center drifts and variance grows.
  const initialWidth = 0.43;
  const diffusivity = 0.18;
  const driftVelocity = 1.65;
  const variance = initialWidth ** 2 + 2 * diffusivity * time;
  const center = -2.05 + driftVelocity * time;
  return (initialWidth / Math.sqrt(variance)) * Math.exp(-((position - center) ** 2) / (2 * variance));
}

function renderPlot(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  ink: string,
  fontFamily: string,
) {
  const left = 32;
  const right = width - 12;
  const top = 28;
  const bottom = height - 49;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const xFor = (position: number) => left + ((position + 3) / 6) * plotWidth;
  const yFor = (concentration: number) => bottom - concentration * plotHeight;

  context.clearRect(0, 0, width, height);
  if (plotWidth <= 0 || plotHeight <= 0) return false;

  context.font = `12px ${fontFamily}`;
  context.fillStyle = ink;
  context.strokeStyle = ink;
  context.lineWidth = 1;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText('归一化浓度', left, 11);

  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, bottom);
  context.lineTo(right, bottom);

  context.textAlign = 'right';
  for (const [value, label] of [[0, '0'], [0.25, '0.25'], [0.5, '0.50'], [0.75, '0.75'], [1, '1']] as const) {
    const y = yFor(value);
    context.moveTo(left - 4, y);
    context.lineTo(left, y);
    context.fillText(label, left - 8, y);
  }

  context.textAlign = 'center';
  for (let position = -3; position <= 3; position++) {
    const x = xFor(position);
    context.moveTo(x, bottom);
    context.lineTo(x, bottom + 4);
    context.fillText(String(position).replace('-', '−'), x, bottom + 16);
  }
  context.fillText('相对位置', (left + right) / 2, height - 11);
  context.globalAlpha = 0.58;
  context.stroke();
  context.globalAlpha = 1;

  const phase = ((elapsed % cycleDuration) / cycleDuration) * 2 * Math.PI;
  const time = 0.1 + 0.24 * (1 - Math.cos(phase));
  const sampleCount = Math.ceil(plotWidth / 2);

  context.save();
  context.beginPath();
  context.rect(left, top, plotWidth, plotHeight);
  context.clip();
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const trace of traces) {
    context.beginPath();
    context.strokeStyle = trace.color;
    context.setLineDash(trace.dash);
    context.moveTo(left, yFor(concentrationAt(-3, time + trace.offset)));
    for (let sample = 1; sample <= sampleCount; sample++) {
      const position = -3 + (6 * sample) / sampleCount;
      context.lineTo(xFor(position), yFor(concentrationAt(position, time + trace.offset)));
    }
    context.stroke();
  }
  context.restore();
  return true;
}

export function ResearchFigure() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const plotId = useId();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;
    let previousFrame: number | undefined;
    let onScreen = false;
    let width = 0;
    let height = 0;
    let ink = '';
    let fontFamily = '';

    function draw() {
      return context && renderPlot(context, width, height, elapsed.current, ink, fontFamily);
    }

    function step(now: number) {
      if (previousFrame !== undefined) elapsed.current += Math.min(now - previousFrame, 50);
      previousFrame = now;
      draw();
      animationFrame = requestAnimationFrame(step);
    }

    function updatePlayback() {
      cancelAnimationFrame(animationFrame);
      previousFrame = undefined;
      if (!paused && !media.matches && onScreen && !document.hidden) {
        animationFrame = requestAnimationFrame(step);
      }
    }

    function resize() {
      if (!canvas || !context) return;
      const bounds = canvas.getBoundingClientRect();
      const styles = getComputedStyle(canvas);
      width = bounds.width;
      height = bounds.height;
      ink = styles.color;
      fontFamily = styles.fontFamily;
      const scale = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      if (draw()) setReady(true);
    }

    resize();
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      updatePlayback();
    });
    visibilityObserver.observe(canvas);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', updatePlayback);
    media.addEventListener('change', updatePlayback);
    document.fonts.addEventListener('loadingdone', draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', updatePlayback);
      media.removeEventListener('change', updatePlayback);
      document.fonts.removeEventListener('loadingdone', draw);
    };
  }, [paused]);

  return (
    <figure className="research-figure" data-ready={ready || undefined}>
      <figcaption className="research-figure-caption">
        <div className="research-figure-title">
          <Text weight="semibold">输运与扩散</Text>
          <Text type="label" color="secondary">数学示意</Text>
        </div>
        <Button
          label={paused ? '播放动效' : '暂停动效'}
          size="sm"
          variant="ghost"
          className="research-figure-playback"
          aria-controls={plotId}
          onClick={() => setPaused(current => !current)}
        />
      </figcaption>
      <div id={plotId} className="research-figure-visual" role="img" aria-label={plotDescription}>
        <img className="research-figure-poster" src="/images/transport-diffusion.webp" alt="" />
        <canvas ref={canvasRef} className="research-figure-plot" aria-hidden="true" />
      </div>
      <ul className="research-figure-legend" aria-label="曲线对应的模拟时刻" role="list">
        {traces.map(trace => (
          <li key={trace.offset}>
            <span aria-hidden="true" className="research-figure-swatch" style={{color: trace.color}} />
            <Text type="label" color="secondary" hasTabularNumbers>{trace.label}</Text>
          </li>
        ))}
      </ul>
    </figure>
  );
}
