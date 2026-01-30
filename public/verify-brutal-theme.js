// Script de teste para verificar se o tema brutal está aplicado corretamente
// Execute este arquivo no console do navegador quando estiver no Dashboard

console.log('🎨 Verificando Tema Brutalista...\n');

// 1. Verificar se o BrutalBackground está renderizado
const backgrounds = document.querySelectorAll('[style*="background"]');
console.log(`✅ Backgrounds encontrados: ${backgrounds.length}`);

// 2. Verificar se as classes brutais estão aplicadas
const brutalCards = document.querySelectorAll('.brutal-card-enhanced');
const statCards = document.querySelectorAll('.stat-card-brutal');
const goldBorders = document.querySelectorAll('.gold-accent-border');

console.log(`\n📦 Cards Brutais:`);
console.log(`  - brutal-card-enhanced: ${brutalCards.length}`);
console.log(`  - stat-card-brutal: ${statCards.length}`);
console.log(`  - gold-accent-border: ${goldBorders.length}`);

// 3. Verificar animações CSS
const styles = Array.from(document.styleSheets)
    .flatMap(sheet => {
        try {
            return Array.from(sheet.cssRules || []);
        } catch {
            return [];
        }
    })
    .filter(rule => rule.cssText?.includes('pulseGold'));

console.log(`\n✨ Animação pulseGold: ${styles.length > 0 ? '✅ Encontrada' : '❌ Não encontrada'}`);

// 4. Verificar tema do usuário
const bodyClass = document.body.className;
console.log(`\n👤 Tema do usuário: ${bodyClass.includes('beauty') ? 'Beauty' : 'Barber'}`);

// 5. Resumo
console.log(`\n📊 RESUMO:`);
console.log(`  ${brutalCards.length > 0 ? '✅' : '❌'} Cards brutais aplicados`);
console.log(`  ${statCards.length > 0 ? '✅' : '❌'} Stat cards com glow`);
console.log(`  ${goldBorders.length > 0 ? '✅' : '❌'} Bordas douradas`);
console.log(`  ${backgrounds.length > 0 ? '✅' : '❌'} Background renderizado`);
console.log(`  ${styles.length > 0 ? '✅' : '❌'} Animações carregadas`);

const allGood = brutalCards.length > 0 && statCards.length > 0 && backgrounds.length > 0;
console.log(`\n${allGood ? '🎉 TEMA BRUTAL APLICADO COM SUCESSO!' : '⚠️ Alguns elementos podem estar faltando'}`);
