import React, { useId, useState } from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const validItems = items.filter(item => item.question.trim() && item.answer.trim());

  if (validItems.length === 0) return null;

  return (
    <div className="es-faq">
      {validItems.map((item, index) => {
        const isOpen = openIndex === index;
        const triggerId = `${baseId}-q-${index}`;
        const panelId = `${baseId}-a-${index}`;
        return (
          <div className="es-faq-item" key={`${index}-${item.question}`} data-open={isOpen || undefined}>
            <h3 className="es-faq-heading">
              <button
                id={triggerId}
                type="button"
                className="es-faq-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(current => (current === index ? null : index))}
              >
                <span>{item.question}</span>
                <span className="es-faq-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              aria-hidden={!isOpen}
              className="es-faq-panel"
              data-open={isOpen || undefined}
            >
              <div className="es-faq-panel-inner">
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
