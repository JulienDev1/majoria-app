// src/components/MotsFlechesButton.tsx
import React from 'react';
import { supabase } from '../supabaseClient'; // Ton client Supabase partagé

interface MotsFlechesButtonProps {
  motsFlechesUrl?: string; // Ex: "https://mots-fleches-maj.vercel.app"
}

export const MotsFlechesButton: React.FC<MotsFlechesButtonProps> = ({ 
  motsFlechesUrl = "https://mots-fleches-maj.vercel.app" 
}) => {
  const handleOpenMotsFleches = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // On passe les jetons dans le fragment URL (#) pour ne pas qu'ils apparaissent dans les logs serveur
      const access_token = session.access_token;
      const refresh_token = session.refresh_token;
      
      const targetUrl = `${motsFlechesUrl}/#access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`;
      window.open(targetUrl, '_blank');
    } else {
      // Si pas connecté, ouvrir l'application directement
      window.open(motsFlechesUrl, '_blank');
    }
  };

  return (
    <button
      onClick={handleOpenMotsFleches}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#f59e0b',
        color: '#ffffff',
        border: 'none',
        padding: '8px 14px',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '13px',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'background-color 0.2s'
      }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d97706')}
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f59e0b')}
    >
      <span>🧩</span>
      <span>Mots-Fléchés</span>
    </button>
  );
};