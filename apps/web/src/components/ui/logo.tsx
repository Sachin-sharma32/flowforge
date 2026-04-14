import Link from 'next/link';
import { Zap } from 'lucide-react';

const Logo = () => {
  return (
    <Link href="/" className="group flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-soft transition-transform duration-300 group-hover:scale-105">
        <Zap className="h-4 w-4" />
      </div>
      <span className="text-lg font-semibold tracking-tight">FlowForge</span>
    </Link>
  );
};

export default Logo;
