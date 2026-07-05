// scripts/seed.mjs
// Popula o tenant da conta de teste com 1 mês de dados sintéticos
// (4 colaboradores, 50 clientes, 150 agendamentos, fila, NPS).
//
// USO:
//   1. cd /root/projetos/Rhian-Lepore
//   2. Confirme que .env.local tem VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
//   3. node agendix-e2e-test/06-template-setup/scripts/seed.mjs
//   4. Quando pedir, cole a senha da conta bob.teste@gmail.com
//
// IDEMPOTENTE: se rodar 2x, detecta o que já existe e só cria o que falta.
//
// ⚠️  NÃO FAZ DELETE. Não toca em dados existentes da bob — só adiciona.
//
// ANTI-PATTERNS EVITADOS:
//   - Não usa service_role key (vai pelo login real da bob + RLS)
//   - Não commita credenciais
//   - Não inventa schema: usa os campos REAIS de services/scheduling.ts

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../../..');

// Carrega .env.local (formato KEY=VALOR)
function loadEnv() {
    const envPath = resolve(projectRoot, '.env.local');
    try {
        const content = readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
        }
    } catch (e) {
        console.error('Não achei .env.local em', envPath);
        process.exit(1);
    }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
    console.error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar no .env.local');
    process.exit(1);
}

const TEST_EMAIL = 'bob.teste@gmail.com';

function ask(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, (ans) => {
        rl.close();
        resolve(ans);
    }));
}

// Senhas brasileiros realistas
const FIRST_NAMES = [
    'Lucas', 'Marcos', 'Pedro', 'Rafael', 'Bruno', 'Felipe', 'Diego', 'Thiago',
    'André', 'Ricardo', 'Carlos', 'Daniel', 'Eduardo', 'Fernando', 'Gabriel',
    'Henrique', 'Igor', 'João', 'Kleber', 'Leonardo', 'Marcelo', 'Nathan',
    'Otávio', 'Paulo', 'Quésia', 'Roberto', 'Sérgio', 'Tiago', 'Ulisses', 'Vinícius',
    'Aline', 'Beatriz', 'Camila', 'Daniela', 'Eliana', 'Fabiana', 'Gisele', 'Helena',
    'Isabela', 'Juliana', 'Karina', 'Larissa', 'Mariana', 'Natália', 'Patrícia',
    'Renata', 'Sabrina', 'Tatiana', 'Vanessa', 'Yasmin', 'Amanda'
];
const LAST_NAMES = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida',
    'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
    'Araújo', 'Melo', 'Barbosa', 'Rocha', 'Dias', 'Nunes', 'Mendes', 'Cavalcanti'
];
const SERVICES = [
    { name: 'Corte Masculino', price: 45, duration: 30 },
    { name: 'Barba', price: 35, duration: 30 },
    { name: 'Corte + Barba', price: 70, duration: 60 },
    { name: 'Sobrancelha', price: 20, duration: 15 },
    { name: 'Pigmentação', price: 80, duration: 45 },
    { name: 'VIP (Corte + Barba + Sobrancelha)', price: 110, duration: 75 },
];
const PROFESSIONALS = [
    { name: 'Lucas Barbeiro', specialty: 'Cortes modernos' },
    { name: 'Marcos Silva', specialty: 'Barba e pigmentação' },
    { name: 'Diego Santos', specialty: 'Cortes clássicos' },
];
const PAYMENT_METHODS = ['pix', 'cash', 'credit', 'debit'];

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomPhone() {
    const ddd = random(['11', '21', '31', '41', '51', '61', '71', '81', '85', '92']);
    const num = Math.floor(900000000 + Math.random() * 99999999);
    return `(${ddd}) 9${String(num).slice(0, 4)}-${String(num).slice(4)}`;
}
function randomDate(daysAgo, daysForward = 0) {
    const now = Date.now();
    const start = now - daysAgo * 86400000;
    const end = now + daysForward * 86400000;
    const t = start + Math.random() * (end - start);
    const d = new Date(t);
    // Horário comercial: 9h-19h
    d.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 4) * 15, 0, 0);
    return d;
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function login() {
    // Ordem de prioridade: env var (CI/agent) > prompt interativo (terminal humano)
    let password = process.env.SEED_PASSWORD;
    if (!password) {
        password = await ask(`Senha da conta ${TEST_EMAIL}: `);
    } else {
        console.log(`[auth] usando SEED_PASSWORD do env (não vai pro histórico do shell)`);
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: TEST_EMAIL, password });
    if (error) {
        console.error('Login falhou:', error.message);
        process.exit(1);
    }
    return data.user;
}

async function getUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    return user.id;
}

async function ensureProfessionals(userId) {
    console.log('\n[1/5] Verificando profissionais...');
    const { data: existing } = await supabase
        .from('team_members')
        .select('id, name, commission_rate, is_owner')
        .eq('user_id', userId);

    const professionals = (existing || []).filter(m => !m.is_owner);
    if (professionals.length >= 3) {
        console.log(`  ✓ Já existem ${professionals.length} profissionais. Pulando.`);
        return professionals;
    }

    const toCreate = PROFESSIONALS.slice(professionals.length).map(p => ({
        user_id: userId,
        name: p.name,
        role: 'barber',
        specialty: p.specialty,
        active: true,
        commission_rate: 40,
    }));

    const { data, error } = await supabase.from('team_members').insert(toCreate).select();
    if (error) {
        console.error('  ✗ Erro criando profissionais:', error.message);
        return professionals;
    }
    console.log(`  ✓ Criados ${data.length} profissionais (40% comissão)`);
    return [...professionals, ...data];
}

async function ensureServices(userId) {
    console.log('\n[2/5] Verificando serviços...');
    const { data: existing } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('user_id', userId);

    if (existing && existing.length >= 6) {
        console.log(`  ✓ Já existem ${existing.length} serviços. Pulando.`);
        return existing;
    }

    const toCreate = SERVICES.map(s => ({
        user_id: userId,
        name: s.name,
        price: s.price,
        duration_minutes: s.duration,
        active: true,
    }));

    const { data, error } = await supabase.from('services').insert(toCreate).select();
    if (error) {
        console.error('  ✗ Erro criando serviços:', error.message);
        return existing || [];
    }
    console.log(`  ✓ Criados ${data.length} serviços`);
    return data;
}

async function ensureClients(userId, count = 50) {
    console.log('\n[3/5] Verificando clientes...');
    const { count: existing } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (existing >= count) {
        console.log(`  ✓ Já existem ${existing} clientes. Pulando.`);
        return existing;
    }

    const toCreate = [];
    for (let i = 0; i < count - existing; i++) {
        const name = `${random(FIRST_NAMES)} ${random(LAST_NAMES)}`;
        toCreate.push({
            user_id: userId,
            name,
            phone: randomPhone(),
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            notes: i % 5 === 0 ? 'Cliente VIP - prefere horário da tarde' : null,
        });
    }

    // Insere em batches de 20 pra não estourar
    let created = 0;
    for (let i = 0; i < toCreate.length; i += 20) {
        const batch = toCreate.slice(i, i + 20);
        const { error } = await supabase.from('clients').insert(batch);
        if (error) {
            console.error(`  ✗ Erro no batch ${i}:`, error.message);
        } else {
            created += batch.length;
        }
    }
    console.log(`  ✓ Criados ${created} clientes (total agora: ${existing + created})`);
    return existing + created;
}

async function ensureAppointments(userId, services, professionals) {
    console.log('\n[4/5] Verificando agendamentos...');
    const { count: existing } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (existing >= 100) {
        console.log(`  ✓ Já existem ${existing} agendamentos. Pulando.`);
        return existing;
    }

    const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .limit(50);

    if (!clients || clients.length === 0) {
        console.error('  ✗ Sem clientes pra criar agendamentos');
        return 0;
    }

    const target = 150 - existing;
    const toCreate = [];
    const now = Date.now();

    for (let i = 0; i < target; i++) {
        const service = random(services);
        const isPast = Math.random() < 0.5;
        const isFuture = !isPast && Math.random() < 0.6;
        const daysAgo = isPast ? Math.floor(Math.random() * 30) + 1 : 0;
        const daysForward = isFuture ? Math.floor(Math.random() * 14) + 1 : 0;
        const aptTime = randomDate(daysAgo, daysForward);

        let status;
        if (aptTime < new Date(now - 3600000)) {
            // Mais de 1h atrás: Completed ou Cancelled
            status = Math.random() < 0.85 ? 'Completed' : 'Cancelled';
        } else {
            // Futuro ou hoje: Confirmed ou Pending
            status = Math.random() < 0.9 ? 'Confirmed' : 'Pending';
        }

        toCreate.push({
            user_id: userId,
            client_id: random(clients).id,
            service: service.name,
            price: service.price,
            appointment_time: aptTime.toISOString(),
            status,
            professional_id: random(professionals).id,
            payment_method: status === 'Completed' ? random(PAYMENT_METHODS) : null,
            notes: Math.random() < 0.1 ? 'Cliente pediu degradê' : null,
        });
    }

    let created = 0;
    for (let i = 0; i < toCreate.length; i += 25) {
        const batch = toCreate.slice(i, i + 25);
        const { error } = await supabase.from('appointments').insert(batch);
        if (error) {
            console.error(`  ✗ Erro no batch ${i}:`, error.message);
        } else {
            created += batch.length;
        }
    }
    console.log(`  ✓ Criados ${created} agendamentos (total agora: ${existing + created})`);
    return existing + created;
}

async function ensureQueueAndNps(userId) {
    console.log('\n[5/5] Verificando fila e NPS...');
    // Fila: 1 ciclo completo (entrou, foi atendido, saiu)
    const { data: existingQueue } = await supabase
        .from('queue_entries')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

    if (!existingQueue || existingQueue.length === 0) {
        const { data: clients } = await supabase
            .from('clients')
            .select('id, name, phone')
            .eq('user_id', userId)
            .limit(3);

        if (clients && clients.length > 0) {
            const queueEntries = clients.map((c, i) => ({
                user_id: userId,
                client_name: c.name,
                client_phone: c.phone,
                service: 'Corte Masculino',
                status: i === 0 ? 'finished' : 'waiting',
                joined_at: new Date(Date.now() - (i + 1) * 600000).toISOString(),
                finished_at: i === 0 ? new Date(Date.now() - 60000).toISOString() : null,
            }));
            const { error } = await supabase.from('queue_entries').insert(queueEntries);
            if (error) {
                console.log(`  ⚠ Fila: ${error.message} (tabela pode não existir ou ter schema diferente)`);
            } else {
                console.log('  ✓ Fila: 1 ciclo completo criado (1 finished + 2 waiting)');
            }
        }
    } else {
        console.log('  ✓ Fila já populada');
    }

    // NPS: 1 avaliação
    const { data: existingNps } = await supabase
        .from('nps_responses')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

    if (!existingNps || existingNps.length === 0) {
        const { data: clients } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', userId)
            .limit(1);
        if (clients && clients.length > 0) {
            const { error } = await supabase.from('nps_responses').insert({
                user_id: userId,
                client_id: clients[0].id,
                score: 9,
                comment: 'Atendimento excelente, barbeiro muito atencioso',
                created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            });
            if (error) {
                console.log(`  ⚠ NPS: ${error.message} (tabela pode não existir)`);
            } else {
                console.log('  ✓ NPS: 1 avaliação criada (score 9)');
            }
        }
    } else {
        console.log('  ✓ NPS já populado');
    }
}

async function main() {
    console.log('Agendix E2E — Seed do ambiente de teste');
    console.log('========================================\n');

    await login();
    const userId = await getUserId();
    console.log(`Logado como ${TEST_EMAIL} (user_id: ${userId})`);

    const professionals = await ensureProfessionals(userId);
    if (professionals.length === 0) {
        console.error('\nSem profissionais, não dá pra continuar. Abortando.');
        process.exit(1);
    }
    const services = await ensureServices(userId);
    if (services.length === 0) {
        console.error('\nSem serviços, não dá pra continuar. Abortando.');
        process.exit(1);
    }
    await ensureClients(userId, 50);
    await ensureAppointments(userId, services, professionals);
    await ensureQueueAndNps(userId);

    console.log('\n========================================');
    console.log('✓ Setup concluído!');
    console.log('Próximos passos:');
    console.log('  1. Abra /reports no app e confirme que os números fazem sentido');
    console.log('  2. Rode o primeiro agente especialista (01-agente-ui-visual.md)');
}

main().catch((e) => {
    console.error('Erro fatal:', e);
    process.exit(1);
});
