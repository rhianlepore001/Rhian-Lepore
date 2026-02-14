# LEI 09: Higiene de Dependências

## MOTIVO
Prevenir supply chain attacks e acúmulo de vulnerabilidades em pacotes desatualizados ou maliciosos.

## GATILHO
Ativado ao sugerir `npm install`, `pip install`, `cargo add` ou qualquer adição ao `package.json`/`requirements.txt`/`Cargo.toml`.

## CRITÉRIOS DE ACEITAÇÃO

### Freshness
Só sugira pacotes com última release < 12 meses.

### Popularity Threshold
Prefira pacotes com >1000 downloads semanais (npm) ou >500 stars (GitHub).

### Security Scan
Antes de adicionar dependência, execute `npm audit` / `pip-audit` / `cargo audit` e rejeite pacotes com CVEs críticos ou altos.

### Minimal Footprint
Evite dependências para funções triviais (ex: não use `left-pad`, `is-odd`).

## WORKFLOW DO AGENTE

```
1. Verificar vulnerabilidades:
   $ pip-audit nome-do-pacote
   
2. Verificar popularidade e manutenção:
   - Downloads/semana: 50,000+ 
   - Última release: < 12 meses
   - GitHub stars: 2,000+
   - Maintainers ativos: 2+

3. Verificar se é realmente necessário:
   - Funcionalidade trivial? -> Implemente inline
   - Já existe no stdlib? -> Use stdlib
```

## EXEMPLO - FUNÇÃO TRIVIAL

```python
# NÃO FAÇA ISSO:
# import is_odd

# FAÇA ISSO:
def is_odd(n: int) -> bool:
    return n % 2 != 0
```
