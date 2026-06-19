export default function MentionsLegales() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14 text-stone-700">
      <h1 className="text-3xl font-bold text-stone-900 mb-8">
        Mentions légales
      </h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">
          Éditeur du site
        </h2>
        <p>Le présent site est édité par :</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <strong>Nom :</strong> Jérémy PHILIPPE
          </li>
          <li>
            <strong>Statut :</strong> Auto-entrepreneur
          </li>
          <li>
            <strong>SIRET :</strong> 97875956100019
          </li>
          <li>
            <strong>Adresse :</strong> 56150 Guenin
          </li>
          <li>
            <strong>Email :</strong> contact@les-ongles-de-doriane.fr
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">
          Hébergement
        </h2>
        <p className="text-sm">
          Ce site est hébergé sur un serveur privé dédié situé en France.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">
          Propriété intellectuelle
        </h2>
        <p className="text-sm">
          L'ensemble des contenus présents sur ce site (textes, images, logos)
          sont la propriété exclusive de l'éditeur. Toute reproduction, même
          partielle, est interdite sans autorisation préalable.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-stone-800 mb-3">
          Responsabilité
        </h2>
        <p className="text-sm">
          L'éditeur s'efforce de maintenir les informations de ce site à jour et
          exactes. Il ne saurait être tenu responsable des erreurs, omissions ou
          des résultats qui pourraient être obtenus par un mauvais usage des
          informations présentes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-3">
          Règlement des litiges
        </h2>
        <p className="text-sm">
          En cas de litige, les parties s'efforceront de trouver un accord
          amiable. À défaut, les tribunaux français seront seuls compétents.
        </p>
      </section>
    </div>
  );
}
