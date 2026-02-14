# LEI 07: Higiene de Credenciais

## MOTIVO
Impedir o erro de usar senhas fracas ou hashes obsoletos.

## GATILHO
Ativado ao implementar cadastro de usuários, login, reset de senha, ou qualquer função que manipule senhas e tokens de acesso.

## REQUISITOS DE SENHA

### Hashing
Use estritamente bcrypt com fator de custo 12. Hashes SHA-256 legados devem ser marcados para migração imediata no próximo login.

### Complexidade
Valide obrigatoriamente: 8+ caracteres, 1 maiúscula, 1 minúscula e 1 número.

### Tokens Seguros
Geradores de tokens de convite ou reset devem usar `secrets.token_urlsafe(32)`.

## EXEMPLO ERRADO
```python
import hashlib
import random

def create_user(email: str, password: str):
    # SHA-256 é rápido demais (brute-force fácil)
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    save_user(email, password_hash)  # Sem validação de complexidade

def generate_reset_token():
    return str(random.randint(100000, 999999))  # Random previsível!
```

## EXEMPLO CORRETO
```python
import bcrypt
import secrets
import re

class PasswordPolicy:
    MIN_LENGTH = 8
    PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$')
    
    @classmethod
    def validate(cls, password: str) -> tuple[bool, str | None]:
        if len(password) < cls.MIN_LENGTH:
            return False, f"Mínimo {cls.MIN_LENGTH} caracteres"
        if not cls.PATTERN.match(password):
            return False, "Deve conter maiúscula, minúscula e número"
        return True, None

def create_user(email: str, password: str):
    valid, error = PasswordPolicy.validate(password)
    if not valid:
        raise ValueError(error)
    
    password_hash = bcrypt.hashpw(
        password.encode(), 
        bcrypt.gensalt(rounds=12)
    ).decode()
    
    save_user(email, password_hash)

def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)
```
