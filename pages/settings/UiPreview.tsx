import React, { useState } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import {
  Button,
  Input,
  Select,
  Card,
  Modal,
  Table,
  Tabs,
  Badge,
  EmptyState,
  Skeleton,
  SkeletonCard,
  ErrorState,
  Checkbox,
  type SelectOption,
  type TableColumn,
  type TabItem
} from '../../components/ui';
import {
  User,
  Mail,
  Lock,
  Search,
  Eye,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'client';
  status: 'active' | 'inactive' | 'pending';
}

const MOCK_USERS: MockUser[] = [
  { id: '1', name: 'Rhian Lepore', email: 'rhian@agendix.com', role: 'admin', status: 'active' },
  { id: '2', name: 'Ana Silva', email: 'ana.silva@agendix.com', role: 'staff', status: 'active' },
  { id: '3', name: 'Lucas Souza', email: 'lucas@gmail.com', role: 'client', status: 'pending' },
  { id: '4', name: 'Maria Souza', email: 'maria@outlook.com', role: 'client', status: 'inactive' },
];

export const UiPreview: React.FC = () => {
  const { colors, font } = useBrutalTheme();

  // Estados dos Controles do Preview
  const [activeTab, setActiveTab] = useState('basics');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  
  // Estados de Formul�rios
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [selectError, setSelectError] = useState('');

  // Tabela e dados
  const [usersData, setUsersData] = useState<MockUser[]>(MOCK_USERS);
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);

  const simulateLoading = () => {
    setButtonLoading(true);
    setTimeout(() => {
      setButtonLoading(false);
    }, 2000);
  };

  const validateForm = () => {
    let valid = true;
    if (!inputValue) {
      setInputError('O campo de nome � obrigat�rio.');
      valid = false;
    } else {
      setInputError('');
    }

    if (!selectValue) {
      setSelectError('Por favor, selecione um perfil.');
      valid = false;
    } else {
      setSelectError('');
    }

    if (valid) {
      alert(`Dados validados com sucesso!\nNome: ${inputValue}\nPerfil: ${selectValue}`);
    }
  };

  const tabsItems: TabItem[] = [
    { id: 'basics', label: 'B�sico (Buttons & Badges)', icon: <Play /> },
    { id: 'forms', label: 'Formul�rios (Inputs & Selects)', icon: <Mail /> },
    { id: 'layout', label: 'Estrutura (Cards & Tables)', icon: <User /> },
    { id: 'feedback', label: 'Feedback (Modal & States)', icon: <AlertTriangle /> },
  ];

  const selectOptions: SelectOption[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'staff', label: 'Equipe/Profissional' },
    { value: 'client', label: 'Cliente Final' },
    { value: 'disabled-opt', label: 'Perfil Desativado', disabled: true },
  ];

  const columns: TableColumn<MockUser>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (row) => <span className="font-bold">{row.name}</span>,
    },
    {
      key: 'email',
      header: 'E-mail',
      render: (row) => row.email,
    },
    {
      key: 'role',
      header: 'Perfil',
      render: (row) => {
        const badgeMap: Record<MockUser['role'], 'accent' | 'neutral'> = {
          admin: 'accent',
          staff: 'neutral',
          client: 'neutral',
        };
        return <Badge variant={badgeMap[row.role]}>{row.role}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const badgeMap: Record<MockUser['status'], 'success' | 'warning' | 'danger'> = {
          active: 'success',
          inactive: 'danger',
          pending: 'warning',
        };
        return <Badge variant={badgeMap[row.status]}>{row.status}</Badge>;
      },
    },
  ];

  return (
    <SettingsLayout>
      <div className="space-y-8 max-w-5xl">
        {/* Cabe�alho */}
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tight ${colors.text} ${font.heading}`}>
            Preview de Componentes Base
          </h1>
          <p className={`text-sm ${colors.textSecondary} mt-1`}>
            Esta tela serve como ambiente de teste e valida��o pr�tica (smoke test visual) para todos os componentes criados na Fase 0.
          </p>
        </div>

        {/* Abas Principais */}
        <Tabs tabs={tabsItems} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Conte�do das Abas */}
        <div className="mt-6">
          {activeTab === 'basics' && (
            <div className="space-y-8">
              {/* Se��o Buttons */}
              <Card title="Buttons (Variantes & Estados)">
                <div className="space-y-6">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.textMuted}`}>Varia��es de Cores/Estilos</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="primary">Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="danger">Danger</Button>
                      <Button variant="success">Success</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.textMuted}`}>Tamanhos</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="sm" variant="primary">Small (sm)</Button>
                      <Button size="md" variant="primary">Medium (md)</Button>
                      <Button size="lg" variant="primary">Large (lg)</Button>
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.textMuted}`}>Com �cones & Largura Total</h4>
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Button icon={<Plus />}>Adicionar Item</Button>
                      <Button iconRight={<Eye />} variant="secondary">Ver Detalhes</Button>
                      <Button icon={<Trash2 />} variant="danger" size="sm">Excluir</Button>
                    </div>
                    <div className="max-w-xs">
                      <Button fullWidth variant="outline">Bot�o Largura Total</Button>
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.textMuted}`}>Estados Din�micos (Clique para testar Loading)</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={simulateLoading} loading={buttonLoading}>
                        {buttonLoading ? 'Carregando...' : 'Clique para Carregar'}
                      </Button>
                      <Button disabled variant="primary">Disabled</Button>
                      <Button disabled loading variant="secondary">Disabled Loading</Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Checkbox">
                <div className="space-y-4">
                  <Checkbox label="Op��o padr�o" defaultChecked />
                  <Checkbox label="Desabilitado" disabled />
                  <Checkbox label="Com erro" error="Selecione para continuar." />
                </div>
              </Card>

              {/* Se��o Badges */}
              <Card title="Badges (Sinalizadores)">
                <div className="space-y-4">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${colors.textMuted}`}>Varia��es Sem�nticas</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="accent">Accent / Info</Badge>
                    <Badge variant="success">Success / Ativo</Badge>
                    <Badge variant="warning">Warning / Pendente</Badge>
                    <Badge variant="danger">Danger / Inativo</Badge>
                    <Badge variant="neutral">Neutral / Outro</Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'forms' && (
            <div className="space-y-8">
              <Card title="Inputs (Campos de Texto)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Nome Completo"
                    placeholder="Digite seu nome..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    hint="Digite o nome completo sem abrevia��es"
                  />
                  <Input
                    label="E-mail (Com �cone)"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    icon={<Mail />}
                  />
                  <Input
                    label="Senha (Senha de Acesso)"
                    type="password"
                    placeholder="��������"
                    icon={<Lock />}
                    disabled
                    hint="Campo desabilitado temporariamente"
                  />
                  <Input
                    label="Campo com Erro"
                    placeholder="Digite algo incorreto..."
                    error={inputError || 'Este campo cont�m um erro de valida��o demonstrativo'}
                  />
                  <Input
                    label="Campo de Busca (Tamanho Pequeno)"
                    size="sm"
                    placeholder="Buscar..."
                    icon={<Search />}
                  />
                  <Input
                    label="Campo Grande (Tamanho Grande)"
                    size="lg"
                    placeholder="Entrada de texto de alta visibilidade..."
                  />
                </div>
              </Card>

              <Card title="Selects (Listas de Sele��o)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select
                    label="Perfil de Usu�rio"
                    placeholder="Selecione um perfil..."
                    options={selectOptions}
                    value={selectValue}
                    onChange={(e) => setSelectValue(e.target.value)}
                    hint="Os perfis definem o n�vel de acesso do usu�rio"
                  />
                  <Select
                    label="Perfil (Desabilitado)"
                    disabled
                    options={selectOptions}
                    placeholder="Selecione..."
                  />
                  <Select
                    label="Perfil (Com Erro)"
                    error={selectError || 'Por favor, corrija a sele��o.'}
                    options={selectOptions}
                    placeholder="Selecione..."
                  />
                </div>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setInputValue(''); setSelectValue(''); setInputError(''); setSelectError(''); }}>
                  Limpar Campos
                </Button>
                <Button variant="primary" onClick={validateForm}>
                  Validar Formul�rio
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-8">
              {/* Cards */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${colors.textMuted}`}>Estilos de Cards</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card variant="default" title="Card Padr�o (Default)">
                    <p className="text-xs leading-relaxed">
                      Usado para agrupamentos normais, formul�rios e listagens gerais sem destaque excessivo.
                    </p>
                  </Card>
                  <Card variant="accent" title="Card Destaque (Accent)">
                    <p className="text-xs leading-relaxed">
                      Possui borda acentuada com base no tema selecionado (Ouro para Barbearias, Violeta para Sal�o de Beleza).
                    </p>
                  </Card>
                  <Card variant="glow" title="Card com Brilho (Glow)">
                    <p className="text-xs leading-relaxed">
                      Usado para cards que necessitam de m�xima aten��o do usu�rio, como promo��es, alertas de assinatura expirando, etc.
                    </p>
                  </Card>
                </div>
              </div>

              {/* Tabela de Dados */}
              <Card
                title="Tabela de Dados (Table)"
                action={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<RotateCcw />}
                      onClick={() => setUsersData(MOCK_USERS)}
                    >
                      Resetar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 />}
                      onClick={() => setUsersData([])}
                    >
                      Esvaziar
                    </Button>
                  </div>
                }
              >
                <div className="space-y-4">
                  <p className="text-xs text-text-secondary">
                    Tabela com dados gen�ricos tipados. Suporta clique na linha, renderiza��o customizada para mobile e teclado.
                  </p>

                  <Table
                    columns={columns}
                    data={usersData}
                    rowKey={(user) => user.id}
                    onRowClick={(user) => setSelectedUser(user)}
                    emptyMessage="Nenhum usu�rio cadastrado neste preview de testes."
                    mobileRender={(user) => (
                      <div className="p-4 border rounded-xl bg-white/5 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{user.name}</span>
                          <Badge variant={user.role === 'admin' ? 'accent' : 'neutral'}>{user.role}</Badge>
                        </div>
                        <p className="text-xs text-text-secondary">{user.email}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <span className="text-xs">Status:</span>
                          <Badge variant={user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'danger'}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                  />

                  {selectedUser && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Linha Selecionada (onClick):</p>
                        <p className="text-sm font-bold">{selectedUser.name} ({selectedUser.email})</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>
                        Fechar Feedback
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-8">
              {/* Modal trigger */}
              <Card title="Modais (Di�logos Flutuantes)">
                <div className="space-y-4">
                  <p className="text-xs text-text-secondary">
                    O modal usa portal para renderizar fora do escopo do DOM local, possui armadilha de foco para acessibilidade e suporta fechamento em ESC ou clique externo.
                  </p>
                  <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                    Abrir Modal de Teste
                  </Button>
                </div>
              </Card>

              {/* Skeletons */}
              <Card title="Loading States (Skeletons)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${colors.textMuted}`}>Skeleton de Linhas / Texto</h4>
                    <Skeleton count={3} />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${colors.textMuted}`}>Skeleton de Card Completo</h4>
                    <SkeletonCard />
                  </div>
                </div>
              </Card>

              {/* Empty & Error States */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Estado Vazio (EmptyState)">
                  <EmptyState
                    icon={Search}
                    title="Nenhum resultado encontrado"
                    description="Tente refinar sua busca utilizando termos diferentes ou filtros de data."
                    action={
                      <Button size="sm" variant="outline">
                        Limpar Filtros
                      </Button>
                    }
                  />
                </Card>

                <Card title="Estado de Erro (ErrorState)">
                  <ErrorState
                    title="Falha na conex�o"
                    message="N�o foi poss�vel sincronizar as altera��es com o servidor. Verifique sua conex�o de internet."
                    onRetry={() => alert('Simulando nova tentativa de requisi��o...')}
                  />
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Modal Declarativo de Teste */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Modal de Teste Acess�vel"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="success" onClick={() => { alert('A��o do Modal Confirmada'); setIsModalOpen(false); }}>
                Confirmar A��o
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm">
              Este modal foi renderizado atrav�s de um Portal do React no body.
            </p>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <CheckCircle className="text-emerald-400 w-8 h-8 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Acessibilidade Garantida</p>
                <p className="text-xs text-text-secondary">Pressione ESC para sair ou clique no fundo de overlay.</p>
              </div>
            </div>
            <Input label="Input dentro do Modal" placeholder="Foco autom�tico e navega��o por tab..." />
          </div>
        </Modal>
      </div>
    </SettingsLayout>
  );
};

