import React from 'react';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Branding block */}
        <div className="flex items-center gap-2">
          <Shield className="text-indigo-500 w-5 h-5" />
          <span className="text-sm font-extrabold text-white tracking-wider">Scanner DPO</span>
        </div>

        {/* Legal documents list links */}
        <nav className="flex flex-wrap justify-center gap-6 text-xs font-semibold">
          <a href="/privacidad" className="hover:text-white transition-colors">
            Política de Privacidad
          </a>
          <a href="/cookies" className="hover:text-white transition-colors">
            Política de Cookies
          </a>
          <a href="/terminos" className="hover:text-white transition-colors">
            Términos y Condiciones
          </a>
          <a href="/arco" className="hover:text-white transition-colors">
            Derechos ARCO+
          </a>
        </nav>

        {/* Copyright notice */}
        <div className="text-[11px] text-slate-600">
          © {new Date().getFullYear()} PrivacyTech SpA • Todos los derechos reservados.
        </div>

      </div>
    </footer>
  );
}
