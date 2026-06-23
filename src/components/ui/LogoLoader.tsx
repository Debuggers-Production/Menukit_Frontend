import logo from '@/assets/menukit-logo.svg';

interface LogoLoaderProps {
  size?: number;
  text?: string;
  className?: string;
}

export function LogoLoader({ size = 64, text = "Loading...", className = "" }: LogoLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center w-full min-h-[40vh] space-y-6 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Glow effect */}
        <div 
          className="absolute rounded-full bg-primary/20 blur-xl animate-pulse"
          style={{ width: size * 1.5, height: size * 1.5, animationDuration: '2s' }}
        />
        
        {/* Floating and pulsing Logo */}
        <div className="relative animate-pulse" style={{ animationDuration: '1.5s' }}>
          <img 
            src={logo} 
            alt="MenuKit Loading" 
            className="drop-shadow-md transition-all duration-300 transform hover:scale-105"
            style={{ width: size, height: size }} 
          />
        </div>
      </div>
      
      {text && (
        <p className="text-sm font-bold text-slate-400 tracking-[0.2em] uppercase animate-pulse" style={{ animationDuration: '2s' }}>
          {text}
        </p>
      )}
    </div>
  );
}
