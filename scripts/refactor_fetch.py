import os
import re

def main():
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src'))
    files_to_modify = []
    
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check if it uses fetch('/api/ or fetch(`/api/
                if re.search(r"fetch\((['`\"])/api/", content):
                    files_to_modify.append(path)
                    
    for path in files_to_modify:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Add import if missing
        import_statement = "import { apiFetch } from '@/lib/api';\n"
        # Determine insertion point (after last import)
        imports = list(re.finditer(r"^import .*;?", content, re.MULTILINE))
        if imports:
            last_import = imports[-1]
            insert_pos = last_import.end() + 1
            if "import { apiFetch }" not in content:
                content = content[:insert_pos] + import_statement + content[insert_pos:]
        elif "import { apiFetch }" not in content:
            content = import_statement + content
            
        # Replace fetch('/api/ with apiFetch('/api/
        content = re.sub(r"fetch\((['`\"])/api/", r"apiFetch(\g<1>/api/", content)
        
        # Replace fetch(url) where url is built dynamically but starts with /api (edge case in HistoryPage)
        # HistoryPage: fetch(url)
        if "HistoryPage.tsx" in path:
            content = content.replace("fetch(url)", "apiFetch(url)")

        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
            print(f"Refactored {os.path.basename(path)}")

if __name__ == "__main__":
    main()
