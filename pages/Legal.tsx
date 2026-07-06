import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

const SECTION_CLASS = 'space-y-2';
const H2_CLASS = 'font-heading text-xl font-bold tracking-tight';
const P_CLASS = 'text-sm leading-relaxed text-[var(--color-text-secondary)]';

export const Legal: React.FC = () => {
    const { pathname } = useLocation();
    const { colors } = useBrutalTheme();
    const isPrivacy = pathname.includes('privacidade');

    return (
        <div className={`min-h-screen ${colors.bg} ${colors.text} font-sans`}>
            <div className="max-w-2xl mx-auto px-6 py-12">
                <Link to="/login" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors mb-10">
                    <ArrowLeft size={14} /> Voltar
                </Link>

                <h1 className="font-heading text-3xl font-bold tracking-tight mb-2">
                    {isPrivacy ? 'Política de Privacidade' : 'Termos de Uso'}
                </h1>
                <p className="text-xs text-[var(--color-text-muted)] mb-10">Última atualização: julho de 2026</p>

                {isPrivacy ? (
                    <div className="space-y-8">
                        <section className={SECTION_CLASS}>
                            <h2 className={H2_CLASS}>1. Dados que coletamos</h2>
                            <p className={P_CLASS}>
                                Coletamos os dados necessários para operar sua conta: nome, e-mail, telefone,
                                dados do seu negócio e os registros de agendamentos e atendimentos que você cria na plataforma.
                            </p>
                        </section>
                        <section className={SECTION_CLASS}>
                            <h2 className={H2_CLASS}>2. Como usamos</h2>
                            <p className={P_CLASS}>
                                Os dados são usados exclusivamente para prestar o serviço: agenda, fila digital,
                                relatórios financeiros e comunicação sobre a sua conta. Não vendemos dados a terceiros.
                            </p>
                        </section>
                        <section className={SECTION_CLASS}>
                            <h2 className={H2_CLASS}>3. Dados dos seus clientes</h2>
                            <p className={P_CLASS}>
                                Os dados dos clientes cadastrados pertencem ao seu estabelecimento. O AgendiX atua como
                                operador desses dados, nos termos da LGPD (Lei nº 13.709/2018), e os mantém isolados por conta.
                            </p>
                        </section>
                        <section className={SECTION_CLASS}>
                            <h2 className={H2_CLASS}>4. Seus direitos</h2>
                            <p className={P_CLASS}>
                                Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
                                pelo e-mail de suporte informado na plataforma.
                            </p>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <section className={SECTION_CLASS}>
                            <h2 className={H2_CLASS}>1. O serviço</h2>
                            <p className={P_CLASS}>
                                O AgendiX é uma plataforma de gestão para barbearias e salões: agendamentos, fila digital,
                                equipe, financeiro e relacionamento com clientes.
                            </p>
                        </section>
                        <section className={SECTION_CLASS}>
                            <h2 className={H2_CLASS}>2. Sua conta</h2>
                            <p className={P_CLASS}>
                                Você é responsável pelas credenciais de acesso e pelas informações cadastradas.
                                Contas de colaboradores são vinculadas à conta do dono do estabelecimento.
                            </p>
                        </section>
                        <section className={SECTION_CLASS}>
                            <h2 className={H2_CLASS}>3. Assinatura e teste</h2>
                            <p className={P_CLASS}>
                                Novas contas têm período de teste grátis. Após o período, o uso continuado requer
                                assinatura ativa. Cancelamentos podem ser feitos a qualquer momento nas configurações.
                            </p>
                        </section>
                        <section className={SECTION_CLASS}>
                            <h2 className={H2_CLASS}>4. Uso aceitável</h2>
                            <p className={P_CLASS}>
                                É proibido usar a plataforma para fins ilícitos, tentar acessar dados de outras contas
                                ou comprometer a segurança do serviço.
                            </p>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Legal;
