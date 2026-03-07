// scripts/backup-supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configurações do Supabase extraídas do ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backup() {
    try {
        console.log('⏳ Iniciando backup manual do Supabase...');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../backups');

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupPath = path.join(backupDir, `backup_${timestamp}.json`);

        // Nota: Como o Supabase não expõe um dump SQL via API JS, 
        // faremos um backup estruturado das tabelas principais como fallback inicial.
        // Em um ambiente real, seria recomendado usar o Supabase CLI para dump SQL.

        const tables = ['establishments', 'profiles', 'appointments', 'services', 'clients', 'finance_categories', 'finance_transactions'];
        const backupData = {};

        for (const table of tables) {
            console.log(`📦 Extraindo dados da tabela: ${table}...`);
            const { data, error } = await supabase.from(table).select('*');

            if (error) {
                console.warn(`⚠️ Aviso: Erro ao ler tabela ${table}:`, error.message);
                backupData[table] = { error: error.message };
            } else {
                backupData[table] = data;
            }
        }

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

        console.log(`\n✅ Backup concluído com sucesso!`);
        console.log(`📂 Arquivo salvo em: ${backupPath}`);
    } catch (error) {
        console.error('❌ Erro fatal ao realizar backup:', error);
    }
}

backup();
