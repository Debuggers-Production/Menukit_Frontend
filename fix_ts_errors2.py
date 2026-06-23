import os
import re

base = r"d:\projects\menu_project\menukit_frontend\src"

def replace_in_file(path, old, new):
    full_path = os.path.join(base, path)
    if os.path.exists(full_path):
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace(old, new)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)

def regex_replace_in_file(path, pattern, new):
    full_path = os.path.join(base, path)
    if os.path.exists(full_path):
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(pattern, new, content)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)

replace_in_file("components/public/CartModal.tsx", "import React, { useState } from 'react';", "import React from 'react';")
regex_replace_in_file("pages/menu/MenuItemsPage.tsx", r"viewMode={viewMode}", "")
regex_replace_in_file("pages/public/StoreDiscoveryPage.tsx", r"\s*setIsScannerStarted\([^)]*\);", "")
replace_in_file("pages/subscription/SubscriptionMarketplacePage.tsx", "function ()", "function (response: any)")

print("Fixed more TS errors.")
