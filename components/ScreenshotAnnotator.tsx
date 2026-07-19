import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Pencil, Trash2, Undo2, Minus } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

export interface ScreenshotAnnotatorRef {
  getAnnotatedDataUrl: () => string | null;
  clear: () => void;
  undo: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface ScreenshotAnnotatorProps {
  imageUrl: string;
  disabled?: boolean;
  className?: string;
}

const PRESET_COLORS = [
  { name: 'vermelho', value: 'var(--color-danger)' },
  { name: 'amarelo', value: 'var(--color-warning)' },
  { name: 'verde', value: 'var(--color-success)' },
  { name: 'azul', value: 'var(--color-info)' },
  { name: 'branco', value: 'var(--color-text)' },
  { name: 'preto', value: 'var(--color-bg)' },
];

const STROKE_WIDTHS = [2, 4, 6, 10];

export const ScreenshotAnnotator = forwardRef<ScreenshotAnnotatorRef, ScreenshotAnnotatorProps>(
  ({ imageUrl, disabled = false, className = '' }, ref) => {
    const { colors, accent, radius } = useBrutalTheme();

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [color, setColor] = useState(PRESET_COLORS[0].value);
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [loaded, setLoaded] = useState(false);

    // Refs usados durante o desenho para não depender de re-renderização entre eventos rápidos
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef<Stroke | null>(null);

    const redraw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);

      const allStrokes = currentStrokeRef.current
        ? [...strokes, currentStrokeRef.current]
        : strokes;

      for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }, [strokes]);

    const resizeCanvas = useCallback(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!container || !canvas || !img || !loaded) return;

      const rect = container.getBoundingClientRect();
      const displayWidth = Math.floor(rect.width);
      const displayHeight = Math.floor(rect.height);

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      canvas.width = Math.floor(displayWidth * dpr);
      canvas.height = Math.floor(displayHeight * dpr);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      redraw(ctx, displayWidth, displayHeight);
    }, [loaded, redraw]);

    useEffect(() => {
      if (!loaded) return;
      resizeCanvas();
      const handleResize = () => resizeCanvas();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [loaded, resizeCanvas]);

    useEffect(() => {
      resizeCanvas();
    }, [strokes, resizeCanvas]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e
        ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX
        : e.clientX;
      const clientY = 'touches' in e
        ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY
        : e.clientY;
      if (clientX == null || clientY == null) return null;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const point = getCoordinates(e);
      if (!point) return;

      isDrawingRef.current = true;
      currentStrokeRef.current = { points: [point], color, width: strokeWidth };

      // Desenho imediato do primeiro ponto no canvas atual
      resizeCanvas();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current || disabled || !currentStrokeRef.current) return;
      e.preventDefault();
      const point = getCoordinates(e);
      if (!point) return;

      currentStrokeRef.current = {
        ...currentStrokeRef.current,
        points: [...currentStrokeRef.current.points, point],
      };

      // Redesenha diretamente sem esperar React re-renderizar
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      redraw(ctx, rect.width, rect.height);
    };

    const stopDrawing = () => {
      if (!isDrawingRef.current || !currentStrokeRef.current) return;

      const finishedStroke = currentStrokeRef.current;
      isDrawingRef.current = false;
      currentStrokeRef.current = null;
      setStrokes((prev) => [...prev, finishedStroke]);
    };

    useImperativeHandle(ref, () => ({
      clear: () => setStrokes([]),
      undo: () => setStrokes((prev) => prev.slice(0, -1)),
      getAnnotatedDataUrl: () => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!container || !canvas || !img) return null;

        const rect = container.getBoundingClientRect();
        const displayWidth = Math.floor(rect.width);
        const displayHeight = Math.floor(rect.height);
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

        const output = document.createElement('canvas');
        output.width = Math.floor(displayWidth * dpr);
        output.height = Math.floor(displayHeight * dpr);
        const ctx = output.getContext('2d');
        if (!ctx) return null;

        ctx.scale(dpr, dpr);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

        const drawCanvas = document.createElement('canvas');
        drawCanvas.width = canvas.width;
        drawCanvas.height = canvas.height;
        const drawCtx = drawCanvas.getContext('2d');
        if (!drawCtx) return null;
        drawCtx.drawImage(canvas, 0, 0);
        ctx.drawImage(drawCanvas, 0, 0, displayWidth, displayHeight);

        return output.toDataURL('image/png');
      },
    }));

    return (
      <div className={`space-y-3 ${className}`}>
        <div
          ref={containerRef}
          className={[
            'relative w-full aspect-video overflow-hidden border cursor-crosshair',
            colors.border,
            radius.card,
            colors.card,
            disabled ? 'cursor-not-allowed opacity-75' : '',
          ].join(' ')}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Print para demarcação"
            className="absolute inset-0 w-full h-full object-contain object-center"
            onLoad={() => setLoaded(true)}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!loaded && (
            <div className={`absolute inset-0 flex items-center justify-center text-xs ${colors.textMuted}`}>
              Carregando print…
            </div>
          )}
        </div>

        <div className={['flex flex-wrap items-center gap-2 p-2 border', colors.border, radius.card, colors.card].join(' ')}>
          <div className="flex items-center gap-1">
            <Pencil className={`w-4 h-4 ${accent.text}`} aria-hidden="true" />
            <span className={`text-xs font-medium ${colors.textSecondary}`}>Lápis</span>
          </div>

          <div className="h-4 w-px bg-[var(--color-divider)]" />

          <div className="flex items-center gap-1" role="group" aria-label="Cores">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                aria-label={`Cor ${c.name}`}
                onClick={() => setColor(c.value)}
                className={[
                  'w-6 h-6 rounded-full border-2 transition-transform',
                  color === c.value ? 'scale-110 border-theme-accent' : 'border-transparent',
                ].join(' ')}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-[var(--color-divider)]" />

          <div className="flex items-center gap-1" role="group" aria-label="Espessura">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                title={`Espessura ${w}px`}
                aria-label={`Espessura ${w}px`}
                onClick={() => setStrokeWidth(w)}
                className={[
                  'w-7 h-7 flex items-center justify-center rounded-md transition-colors',
                  strokeWidth === w ? 'bg-[var(--color-accent-dim)] text-theme-accent' : 'hover:bg-[var(--color-card-hover)]',
                ].join(' ')}
              >
                <Minus className="w-4 h-4" strokeWidth={w} />
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[var(--color-divider)]" />

          <button
            type="button"
            title="Desfazer último traço"
            onClick={() => setStrokes((prev) => prev.slice(0, -1))}
            disabled={strokes.length === 0}
            className={[
              'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              strokes.length > 0 ? 'hover:bg-[var(--color-card-hover)]' : '',
              colors.textSecondary,
            ].join(' ')}
          >
            <Undo2 className="w-3.5 h-3.5" />
            Desfazer
          </button>

          <button
            type="button"
            title="Limpar marcações"
            onClick={() => setStrokes([])}
            disabled={strokes.length === 0}
            className={[
              'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              strokes.length > 0 ? 'hover:bg-[var(--color-danger-bg)] text-[var(--color-danger)]' : '',
              colors.textSecondary,
            ].join(' ')}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>
      </div>
    );
  }
);

ScreenshotAnnotator.displayName = 'ScreenshotAnnotator';
