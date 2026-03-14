import os
from pathlib import Path
import google.genai as genai
from google.genai import types

# Carregar env files
for env_file in ['.env', '.env.local']:
    p = Path(env_file)
    if p.exists():
        for line in p.read_text(encoding='utf-8').splitlines():
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# Verificar GEMINI_API_KEY
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print("❌ GEMINI_API_KEY não encontrada em .env ou .env.local")
    exit(1)

# Testar embedding
client = genai.Client(api_key=api_key)
res = client.models.embed_content(
    model='models/gemini-embedding-2-preview',
    contents='teste de embedding',
    config=types.EmbedContentConfig(output_dimensionality=768)
)
print(f'[OK] gemini-embedding-2-preview dimensoes: {len(res.embeddings[0].values)}')
