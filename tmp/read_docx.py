import zipfile
import xml.etree.ElementTree as ET
import os

def read_docx(path):
    """Extrai texto de um arquivo .docx sem dependências externas."""
    try:
        with zipfile.ZipFile(path, 'r') as z:
            xml_content = z.read('word/document.xml')
        
        tree = ET.fromstring(xml_content)
        
        # Namespace do Word
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        paragraphs = []
        for para in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = []
            for node in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                if node.text:
                    texts.append(node.text)
            line = ''.join(texts)
            if line.strip():
                paragraphs.append(line)
        
        return '\n'.join(paragraphs)
    except Exception as e:
        return f"[ERRO ao ler arquivo: {e}]"


base_dir = r"c:\Users\User\Downloads\Rhian-Lepore-main\e2e\cowork-testes]"

files = [
    "AgenX_QA_Onboarding_Dashboard.docx",
    "AgenX_QA_Report_Login.docx",
]

for fname in files:
    full_path = os.path.join(base_dir, fname)
    print(f"\n{'='*60}")
    print(f"  ARQUIVO: {fname}")
    print(f"{'='*60}\n")
    content = read_docx(full_path)
    print(content)
    print()
