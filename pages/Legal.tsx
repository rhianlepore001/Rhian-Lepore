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
                <p className="text-xs text-[var(--color-text-muted)] mb-10">Última atualização: outubro de 2026</p>

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
                                Os dados são usados para prestar o serviço: agenda, fila digital,
                                relatórios financeiros e comunicação sobre a sua conta. Com sua autorização,
                                também medimos a eficácia dos nossos anúncios, conforme a seção sobre cookies. Não vendemos dados a terceiros.
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
                        <section className={SECTION_CLASS}>
                            <h2 className={H2_CLASS}>5. Cookies e Meta</h2>
                            <p className={P_CLASS}>
                                O armazenamento essencial mantém a sessão e sua preferência de cookies.
                                Somente com seu consentimento usamos o Meta Pixel e a API de Conversões
                                nas páginas de entrada e cadastro para medir visitas, início e conclusão
                                do cadastro e melhorar anúncios. Não rastreamos o painel nem as páginas
                                públicas de atendimento dos nossos clientes.
                            </p>
                            <p className={P_CLASS}>
                                A Meta pode receber eventos, identificadores de cookies, IP e navegador;
                                no cadastro, e-mail e telefone são enviados pela API com hash SHA-256
                                para correspondência. O hash permite associação pela Meta e não torna
                                esses dados anônimos. A Meta pode processar dados fora do Brasil e do
                                Espaço Econômico Europeu, conforme sua{' '}
                                <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="underline">Política de Privacidade</a>.
                            </p>
                            <p className={P_CLASS}>
                                A Meta Platforms Ireland Ltd. atua como destinatária e operadora desses dados para o Meta Pixel e a API de Conversões.
                            </p>
                            <p className={P_CLASS}>
                                Você pode aceitar ou recusar sem perder acesso ao serviço. A escolha é
                                salva neste navegador por até 180 dias. Use Preferências de cookies
                                nesta página para alterar ou retirar seu consentimento, nos termos
                                da LGPD e do RGPD. A retirada interrompe os próximos envios e remove
                                os cookies Meta acessíveis neste domínio; não desfaz envios anteriores.
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
                                Novas contas começam com um período de teste. Após o período, o uso continuado requer
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
