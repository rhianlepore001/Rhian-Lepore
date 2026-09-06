import React from 'react';

interface SocialProofProps {
  enabled: boolean;
}

export const SocialProof: React.FC<SocialProofProps> = ({ enabled }) => {
  if (!enabled) return null;

  return (
    <section className="landing-social-proof" aria-label="Prova social">
      <p>Feito para negócios que cuidam de cada detalhe.</p>
    </section>
  );
};
