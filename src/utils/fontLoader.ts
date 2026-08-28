export function loadGoogleFont(fontFamily: string) {
  if (!fontFamily) return;
  
  // Format the font family name for Google Fonts URL
  const formattedName = fontFamily.replace(/\s+/g, '+');
  const url = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@300;400;500;600;700;800&display=swap`;
  
  // Check if link already exists
  const existingLink = document.querySelector(`link[href="${url}"]`);
  if (existingLink) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}
