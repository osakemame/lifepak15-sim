import React, { useEffect, useState } from 'react';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

// Bouton « Installer l'application » (Android / ordinateur) ou explication pour iPhone / iPad.
export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault(); // garde l'invite pour notre bouton
      setPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  if (prompt) {
    return (
      <button
        className="btn"
        onClick={async () => {
          prompt.prompt();
          await prompt.userChoice.catch(() => {});
          setPrompt(null);
        }}
      >
        Installer l'application
      </button>
    );
  }

  if (isIos()) {
    return (
      <div className="text-center text-sm text-gray-400">
        <button className="underline" onClick={() => setShowIos((v) => !v)}>
          Installer sur l'écran d'accueil
        </button>
        {showIos && (
          <p className="mt-2">
            Dans Safari, touchez le bouton <b>Partager</b> (carré avec une flèche), puis <b>Sur l'écran d'accueil</b>.
          </p>
        )}
      </div>
    );
  }
  return null;
}
