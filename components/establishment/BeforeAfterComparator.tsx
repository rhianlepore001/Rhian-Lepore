import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface BeforeAfterComparatorProps {
  before: string;
  after: string;
  caption?: string;
  showCaption?: boolean;
}

const MIN_POSITION = 5;
const MAX_POSITION = 95;
const INITIAL_POSITION = 50;
const TOUCH_DRAG_THRESHOLD_PX = 8;

function clampFloat(value: number): number {
  return Math.min(MAX_POSITION, Math.max(MIN_POSITION, value));
}

export function BeforeAfterComparator({
  before,
  after,
  caption,
  showCaption = false,
}: BeforeAfterComparatorProps) {
  const [position, setPosition] = useState(INITIAL_POSITION);

  const stageRef = useRef<HTMLDivElement>(null);
  const beforePhotoRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const beforeCaptionRef = useRef<HTMLElement>(null);
  const afterCaptionRef = useRef<HTMLElement>(null);
  const livePositionRef = useRef(INITIAL_POSITION);
  const dragRef = useRef<{
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    initialPos: number;
    committed: boolean;
    rectLeft: number;
    rectWidth: number;
  } | null>(null);

  const applyVisualPosition = useCallback((next: number) => {
    const clamped = clampFloat(next);
    const rounded = Math.round(clamped);
    livePositionRef.current = clamped;
    if (beforePhotoRef.current) {
      beforePhotoRef.current.style.clipPath = `inset(0 ${(100 - clamped).toFixed(3)}% 0 0)`;
    }
    if (railRef.current) {
      railRef.current.style.transform = `translate3d(${clamped.toFixed(3)}%, 0, 0)`;
    }
    if (beforeCaptionRef.current) {
      beforeCaptionRef.current.style.opacity = clamped < 18 ? '0' : '1';
    }
    if (afterCaptionRef.current) {
      afterCaptionRef.current.style.opacity = clamped > 82 ? '0' : '1';
    }
    if (sliderRef.current) {
      sliderRef.current.setAttribute('aria-valuenow', String(rounded));
      sliderRef.current.setAttribute('aria-valuetext', `${rounded}% antes, ${100 - rounded}% depois`);
    }
    return clamped;
  }, []);

  useEffect(() => {
    applyVisualPosition(position);
  }, [position, applyVisualPosition]);

  const positionFromClientX = useCallback((clientX: number, rectLeft: number, rectWidth: number): number => {
    if (rectWidth <= 0) return livePositionRef.current;
    return clampFloat(((clientX - rectLeft) / rectWidth) * 100);
  }, []);

  const markInteracted = useCallback(() => {
    stageRef.current?.setAttribute('data-interacted', 'true');
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (dragRef.current !== null) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const onKnob = Boolean((event.target as HTMLElement | null)?.closest?.('.es-before-slider'));
    const immediate = event.pointerType !== 'touch' || onKnob;

    dragRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      initialPos: livePositionRef.current,
      committed: immediate,
      rectLeft: rect.left,
      rectWidth: rect.width,
    };

    if (immediate) {
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Ignore capture errors in synthetic events
        }
      }
      stage.setAttribute('data-dragging', 'true');
      markInteracted();
      applyVisualPosition(positionFromClientX(event.clientX, rect.left, rect.width));
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (!drag.committed) {
      const dx = Math.abs(event.clientX - drag.startX);
      const dy = Math.abs(event.clientY - drag.startY);
      if (dy > TOUCH_DRAG_THRESHOLD_PX && dy >= dx) {
        dragRef.current = null;
        return;
      }
      if (dx <= TOUCH_DRAG_THRESHOLD_PX) return;
      drag.committed = true;
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Ignore capture errors
        }
      }
      stageRef.current?.setAttribute('data-dragging', 'true');
      markInteracted();
    }

    applyVisualPosition(positionFromClientX(event.clientX, drag.rectLeft, drag.rectWidth));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    stageRef.current?.removeAttribute('data-dragging');
    if (typeof event.currentTarget.releasePointerCapture === 'function') {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore release errors
      }
    }
    if (drag.committed) {
      setPosition(Math.round(livePositionRef.current));
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    stageRef.current?.removeAttribute('data-dragging');
    if (typeof event.currentTarget.releasePointerCapture === 'function') {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore release errors
      }
    }
    applyVisualPosition(drag.initialPos);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 15 : 5;
    let next: number | null = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = livePositionRef.current - step;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = livePositionRef.current + step;
    else if (event.key === 'PageDown') next = livePositionRef.current - 15;
    else if (event.key === 'PageUp') next = livePositionRef.current + 15;
    else if (event.key === 'Home') next = MIN_POSITION;
    else if (event.key === 'End') next = MAX_POSITION;
    if (next === null) return;
    event.preventDefault();
    markInteracted();
    const clamped = Math.round(applyVisualPosition(next));
    setPosition(clamped);
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.closest('.es-photo')?.setAttribute('data-broken', 'true');
  };

  const label = caption ? `Comparar antes e depois: ${caption}` : 'Comparar antes e depois';
  const rounded = Math.round(position);

  return (
    <div className="es-before" role="group" aria-label={caption || 'Antes e depois'}>
      <div
        ref={stageRef}
        className="es-before-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <figure className="es-before-layer es-before-after">
          <div className="es-photo">
            <img
              src={after}
              alt="Depois"
              loading="lazy"
              decoding="async"
              draggable={false}
              width={960}
              height={720}
              onError={handleImageError}
            />
          </div>
          <figcaption ref={afterCaptionRef}>Depois</figcaption>
        </figure>

        <figure className="es-before-layer es-before-original">
          <div
            ref={beforePhotoRef}
            className="es-photo"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          >
            <img
              src={before}
              alt="Antes"
              loading="lazy"
              decoding="async"
              draggable={false}
              width={960}
              height={720}
              onError={handleImageError}
            />
          </div>
          <figcaption ref={beforeCaptionRef}>Antes</figcaption>
        </figure>

        <div
          ref={railRef}
          className="es-before-rail"
          style={{ transform: `translate3d(${position}%, 0, 0)` }}
        >
          <span className="es-before-line" aria-hidden="true" />
          <div
            ref={sliderRef}
            className="es-before-slider"
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={MIN_POSITION}
            aria-valuemax={MAX_POSITION}
            aria-valuenow={rounded}
            aria-valuetext={`${rounded}% antes, ${100 - rounded}% depois`}
            onKeyDown={handleKeyDown}
          >
            <span className="es-before-knob" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 7l-5 5 5 5" />
                <path d="M15 7l5 5-5 5" />
              </svg>
            </span>
          </div>
        </div>

        <span className="es-before-hint" aria-hidden="true">
          Deslize
        </span>
      </div>
      {caption && showCaption && <p className="es-before-caption">{caption}</p>}
    </div>
  );
}
