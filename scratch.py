import os
import re

file_path = 'd:/Projects/Menukit/menukit_frontend/src/App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace react import to include lazy and Suspense
content = re.sub(
    r"import \{ useEffect \} from 'react';",
    "import { useEffect, lazy, Suspense } from 'react';",
    content
)

# Find all imports like: import { X } from '@/pages/...';
pattern = re.compile(r"import\s*\{\s*([A-Za-z0-9_]+)\s*\}\s*from\s*['\"]([^'\"]+)['\"];")
matches = pattern.finditer(content)

for match in matches:
    component = match.group(1)
    path = match.group(2)
    # Only replace if it's a page component
    if 'Page' in component:
        replacement = f"const {component} = lazy(() => import('{path}').then(m => ({{ default: m.{component} }})));"
        content = content.replace(match.group(0), replacement)

# Wrap Routes in Suspense
content = content.replace('<Routes>', '<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>\n      <Routes>')
content = content.replace('</Routes>', '</Routes>\n      </Suspense>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated App.tsx')
