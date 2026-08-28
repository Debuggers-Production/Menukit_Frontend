css_content = """@import "tailwindcss";

/* Hide all forms of Google Translate top banner globally across all pages */
.goog-te-banner-frame,
iframe.goog-te-banner-frame,
#goog-gt-tt,
.goog-te-balloon-frame,
div#goog-gt-tt,
.VIpgJd-ZVi9od-ORHb-OEVmcd,
.VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
body > .skiptranslate,
.goog-te-banner-frame.skiptranslate,
iframe.skiptranslate,
.VIpgJd-ZVi9od-l4e4b-OEVmcd {
  display: none !important;
  visibility: hidden !important;
}

body {
  top: 0px !important;
  position: static !important;
}

@custom-variant dark (&:where(.force-dark, .force-dark *));

@theme {
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);

  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);

  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);

  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);

  --color-primary-50: #fff7ed;
  --color-primary-100: #ffedd5;
  --color-primary-200: #fed7aa;
  --color-primary-300: #fdba74;
  --color-primary-400: #fb923c;
  --color-primary-500: #f97316;
  --color-primary-600: #ea580c;
  --color-primary-700: #c2410c;
  --color-primary-800: #9a3412;
  --color-primary-900: #7c2d12;
  --color-primary-950: #431407;
  
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-heading: 'Outfit', system-ui, -apple-system, sans-serif;

  --animate-in: animate-in 0.2s ease-out;
  --animate-out: animate-out 0.2s ease-in;
  --animate-fade-in: fade-in 0.3s ease-out forwards;
  --animate-slide-up: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
}

@layer base {
  :root {
    --background: #f8fafc;
    --foreground: #0f172a;
    
    --card: #ffffff;
    --card-foreground: #0f172a;
    
    --popover: #ffffff;
    --popover-foreground: #0f172a;
    
    --primary: #f97316;
    --primary-foreground: #ffffff;
    
    --secondary: #f1f5f9;
    --secondary-foreground: #0f172a;
    
    --muted: #f1f5f9;
    --muted-foreground: #64748b;
    
    --accent: #f1f5f9;
    --accent-foreground: #0f172a;
    
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    
    --success: #10b981;
    --success-foreground: #ffffff;

    --warning: #f59e0b;
    --warning-foreground: #ffffff;

    --info: #3b82f6;
    --info-foreground: #ffffff;

    --border: #e2e8f0;
    --input: #e2e8f0;
    --ring: #f97316;
    
    --radius: 0.75rem;
  }

  .dark {
    --background: #020617;
    --foreground: #f8fafc;
    
    --card: #0f172a;
    --card-foreground: #f8fafc;
    
    --popover: #0f172a;
    --popover-foreground: #f8fafc;
    
    --primary: #f97316;
    --primary-foreground: #ffffff;
    
    --secondary: #1e293b;
    --secondary-foreground: #f8fafc;
    
    --muted: #1e293b;
    --muted-foreground: #94a3b8;
    
    --accent: #1e293b;
    --accent-foreground: #f8fafc;
    
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    
    --success: #10b981;
    --success-foreground: #ffffff;

    --warning: #f59e0b;
    --warning-foreground: #ffffff;

    --info: #3b82f6;
    --info-foreground: #ffffff;

    --border: #1e293b;
    --input: #1e293b;
    --ring: #ea580c;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary;
  }
  h1, h2, h3, h4, h5, h6 {
    @apply font-heading tracking-tight;
  }
}

/* Glassmorphism Utilities */
@layer utilities {
  .glass {
    @apply bg-white/70 backdrop-blur-md border border-white/20;
  }
  .glass-card {
    @apply bg-white/80 backdrop-blur-lg border border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)];
  }
  .glass-panel {
    @apply bg-white/90 backdrop-blur-xl border border-slate-200;
  }
  .text-balance {
    text-wrap: balance;
  }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  @apply bg-slate-300 rounded-full;
}
::-webkit-scrollbar-thumb:hover {
  @apply bg-slate-400;
}

/* Animations */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out forwards;
}

.animate-slide-up {
  animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Delay utilities */
.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }

/* Hide number input spin buttons and block scroll behavior */
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
}

/* Global Excalidraw Clean Overrides */
.excalidraw {
  --ui-font: Inter, system-ui, -apple-system, sans-serif !important;
}

.excalidraw .encrypted-icon,
.excalidraw [title*="Encrypted"],
.excalidraw [aria-label*="Encrypted"],
.excalidraw .lock-icon {
  display: none !important;
}

.excalidraw button[data-testid="image"],
.excalidraw button[data-testid="web-embed"],
.excalidraw button[data-testid="embeddable"],
.excalidraw button[title*="Image"],
.excalidraw button[title*="image"],
.excalidraw button[title*="Embed"],
.excalidraw button[title*="embed"],
.excalidraw div[data-testid="image"],
.excalidraw div[data-testid="embeddable"] {
  display: none !important;
}

/* Restore horizontal scrollbars on desktop/laptop for scrollable tabs */
@media (pointer: fine) {
  .scrollbar-hide::-webkit-scrollbar,
  .no-scrollbar::-webkit-scrollbar {
    display: block !important;
    height: 4px !important;
  }
  
  .scrollbar-hide::-webkit-scrollbar-track,
  .no-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-hide::-webkit-scrollbar-thumb,
  .no-scrollbar::-webkit-scrollbar-thumb {
    background-color: #cbd5e1; /* slate-300 */
    border-radius: 9999px;
  }
  .dark .scrollbar-hide::-webkit-scrollbar-thumb,
  .dark .no-scrollbar::-webkit-scrollbar-thumb {
    background-color: #475569; /* slate-600 */
  }
}
"""

with open(r"d:\Projects\Menukit\Menukit_Frontend\src\index.css", "w") as f:
    f.write(css_content)

print("Restored index.css properly")
