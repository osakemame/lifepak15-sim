import React from 'react';

// Copyright et clause de non-responsabilité (texte fourni par l'auteur)
export default function Footer() {
  return (
    <footer className="mx-auto max-w-md px-2 pb-4 pt-2 text-center text-[11px] leading-snug text-gray-500">
      <p className="font-semibold text-gray-400">© 2026 Hoël BRU. Tous droits réservés.</p>
      <p>
        <b>Clause de non-responsabilité (disclaimer) :</b> outil de simulation pédagogique développé à titre personnel et
        mis à disposition à titre gratuit, non destiné à un usage médical. Aucun lien avec Physio-Control / Stryker :
        LIFEPAK est une marque de son propriétaire. Il ne constitue pas un outil officiel et ne se substitue en aucun
        cas aux procédures, consignes et règlements en vigueur. L'utilisateur reste seul responsable de l'usage des
        informations fournies.
      </p>
    </footer>
  );
}
