import os
import re
import sys

def migrate_file(filepath):
    print(f"Migrating {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Dictionary of replacements.
    # Note: Using word boundaries (\b) is important to avoid partial matches (e.g. replacing text-slate-500 inside a larger string)
    # But for Tailwind classes inside quotes, sometimes they have prefixes like dark: or hover:
    # A simple regex substitution for common patterns:
    
    replacements = [
        # Backgrounds
        (r'\bbg-white\b', 'bg-background'),
        (r'\bdark:bg-slate-900\b', ''),
        (r'\bbg-slate-50\b', 'bg-muted/50'),
        (r'\bdark:bg-slate-800/50\b', ''),
        (r'\bdark:bg-slate-800\b', ''),
        (r'\bbg-slate-100\b', 'bg-muted'),
        
        # Borders
        (r'\bborder-slate-200\b', 'border-border'),
        (r'\bdark:border-slate-800\b', ''),
        (r'\bdark:border-slate-700\b', ''),
        (r'\bborder-slate-100\b', 'border-border'),
        (r'\bborder-slate-300\b', 'border-border'),
        
        # Text colors
        (r'\btext-slate-900\b', 'text-foreground'),
        (r'\bdark:text-white\b', ''),
        (r'\btext-slate-800\b', 'text-foreground'),
        (r'\bdark:text-slate-100\b', ''),
        (r'\btext-slate-700\b', 'text-foreground'),
        (r'\bdark:text-slate-200\b', ''),
        (r'\btext-slate-600\b', 'text-muted-foreground'),
        (r'\bdark:text-slate-300\b', ''),
        (r'\btext-slate-500\b', 'text-muted-foreground'),
        (r'\bdark:text-slate-400\b', ''),
        (r'\btext-slate-400\b', 'text-muted-foreground'),
        (r'\bdark:text-slate-500\b', ''),
        
        # specific primary / hover states
        (r'\bhover:bg-slate-100\b', 'hover:bg-accent'),
        (r'\bhover:bg-slate-50\b', 'hover:bg-accent/50'),
        (r'\bhover:text-slate-900\b', 'hover:text-accent-foreground'),
        (r'\bdark:hover:bg-slate-800\b', ''),
        (r'\bdark:hover:text-white\b', ''),
        
        # Reds to destructives
        (r'\btext-red-500\b', 'text-destructive'),
        (r'\btext-red-600\b', 'text-destructive'),
        (r'\bbg-red-50\b', 'bg-destructive/10'),
        (r'\bbg-red-100\b', 'bg-destructive/20'),
        (r'\bdark:bg-red-900/20\b', ''),
        (r'\bdark:bg-red-900/30\b', ''),
        (r'\bhover:bg-red-50\b', 'hover:bg-destructive/10'),
        (r'\bhover:bg-red-100\b', 'hover:bg-destructive/20'),
        (r'\bdark:hover:bg-red-900/40\b', ''),
        (r'\bhover:text-red-500\b', 'hover:text-destructive'),
        (r'\bborder-red-200\b', 'border-destructive/20'),
        (r'\bdark:border-red-800\b', ''),
        
        # Greens to success
        (r'\btext-green-500\b', 'text-success'),
        (r'\btext-green-600\b', 'text-success'),
        (r'\btext-green-700\b', 'text-success'),
        (r'\bdark:text-green-400\b', ''),
        (r'\bdark:text-green-300\b', ''),
        (r'\bbg-green-50\b', 'bg-success/10'),
        (r'\bbg-green-100\b', 'bg-success/20'),
        (r'\bdark:bg-green-900/20\b', ''),
        (r'\bdark:bg-green-900/30\b', ''),
    ]

    new_content = content
    for pattern, replacement in replacements:
        new_content = re.sub(pattern, replacement, new_content)

    # Cleanup double spaces created by empty replacements
    new_content = re.sub(r' {2,}', ' ', new_content)
    new_content = re.sub(r' \"', '"', new_content)
    new_content = re.sub(r'\' ', "'", new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes in {filepath}")

if __name__ == '__main__':
    files_to_migrate = [
        "d:/Projects/Menukit/Menukit_Frontend/src/pages/menu/MenuItemsPage.tsx",
        "d:/Projects/Menukit/Menukit_Frontend/src/pages/discounts/DiscountsPage.tsx",
        "d:/Projects/Menukit/Menukit_Frontend/src/pages/shop/ShopSetupPage.tsx"
    ]
    for fp in files_to_migrate:
        if os.path.exists(fp):
            migrate_file(fp)
        else:
            print(f"File not found: {fp}")
