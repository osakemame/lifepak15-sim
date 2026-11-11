import React, { useState } from 'react';
import Hub from './pages/Hub.jsx';
import TrainerPage from './pages/TrainerPage.jsx';
import TraineePage from './pages/TraineePage.jsx';
import { clearSession, isValidPin, loadSession } from './services/session.js';

// Routage minimal par état (pas de bibliothèque de routes nécessaire à ce stade).
// Au démarrage : reprise automatique de la dernière session si elle date de moins de 12 h
// (cas du rafraîchissement de page), sauf si l'URL contient un code (?pin=1234).
function initialRoute() {
  const urlPin = new URLSearchParams(window.location.search).get('pin');
  if (urlPin && isValidPin(urlPin)) return { name: 'hub', pin: urlPin };

  const saved = loadSession();
  if (saved?.role === 'trainer') {
    return { name: 'trainer', pin: saved.pin, mspType: saved.mspType, resume: true };
  }
  if (saved?.role === 'trainee') return { name: 'trainee', pin: saved.pin };
  return { name: 'hub' };
}

export default function App() {
  const [route, setRoute] = useState(initialRoute);

  const goHub = () => {
    clearSession();
    // Retire le code éventuel de l'URL
    window.history.replaceState({}, '', window.location.pathname);
    setRoute({ name: 'hub' });
  };

  if (route.name === 'trainer') {
    return (
      <TrainerPage
        pin={route.pin}
        resume={route.resume}
        mspType={route.mspType}
        onQuit={goHub}
      />
    );
  }

  if (route.name === 'trainee') {
    return <TraineePage pin={route.pin} onQuit={goHub} />;
  }

  return (
    <Hub
      initialPin={route.pin}
      onCreate={(mspType) => setRoute({ name: 'trainer', mspType })}
      onJoin={(pin) => setRoute({ name: 'trainee', pin })}
    />
  );
}
