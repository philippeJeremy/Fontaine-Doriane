export default function Confidentialite() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14 text-stone-700 space-y-8">
      <h1 className="text-3xl font-bold text-stone-900">Politique de confidentialité</h1>
      <p className="text-sm text-stone-500">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>

      {/* 1 */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">1. Responsable du traitement</h2>
        <p className="text-sm">
          [PRÉNOM NOM], auto-entrepreneur — [ADRESSE] — contact@les-ongles-de-doriane.fr
        </p>
      </section>

      {/* 2 */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">2. Données collectées et finalités</h2>
        <div className="text-sm space-y-2">
          <p>Lors de la création de compte et de la prise de rendez-vous, nous collectons :</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Prénom, nom</strong> — identification et confirmation de rendez-vous</li>
            <li><strong>Adresse email</strong> — connexion et envoi des confirmations</li>
            <li><strong>Numéro de téléphone</strong> (optionnel) — contact en cas de besoin</li>
            <li><strong>Historique des rendez-vous</strong> — suivi des prestations</li>
          </ul>
          <p className="mt-2">
            <strong>Base légale :</strong> exécution du contrat (Art. 6.1.b RGPD) — ces données
            sont nécessaires pour gérer vos réservations.
          </p>
        </div>
      </section>

      {/* 3 */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">3. Durée de conservation</h2>
        <p className="text-sm">
          Les données sont conservées tant que votre compte est actif. En cas de suppression du
          compte, vos données personnelles et votre historique de rendez-vous sont supprimés
          immédiatement et définitivement.
        </p>
      </section>

      {/* 4 */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">4. Sous-traitants</h2>
        <div className="text-sm space-y-1">
          <p>Nous faisons appel aux sous-traitants suivants :</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>
              <strong>Resend Inc.</strong> (USA) — envoi des emails de confirmation.
              Transfert encadré par les clauses contractuelles types de la Commission européenne.
              <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="text-sauge-500 ml-1 underline">Politique Resend</a>
            </li>
            <li>
              <strong>Serveur privé dédié</strong> — hébergement des données, situé en France.
            </li>
          </ul>
        </div>
      </section>

      {/* 5 */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">5. Cookies</h2>
        <p className="text-sm">
          Ce site utilise un unique cookie technique nommé <code className="bg-stone-100 px-1 rounded">refresh_token</code>,
          strictement nécessaire à votre authentification. Il ne sert à aucun suivi ni à
          aucune finalité publicitaire. Conformément aux recommandations de la CNIL, ce cookie
          est exempt de consentement.
        </p>
      </section>

      {/* 6 */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-2">6. Vos droits (RGPD)</h2>
        <div className="text-sm space-y-2">
          <p>Vous disposez des droits suivants sur vos données :</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><strong>Accès et portabilité</strong> — exportez vos données depuis votre profil</li>
            <li><strong>Rectification</strong> — modifiez vos informations depuis votre profil</li>
            <li><strong>Effacement</strong> — supprimez votre compte depuis votre profil</li>
            <li><strong>Opposition / limitation</strong> — contactez-nous par email</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits : <a href="mailto:contact@les-ongles-de-doriane.fr" className="text-sauge-500 underline">contact@les-ongles-de-doriane.fr</a>
          </p>
          <p>
            En cas de réclamation non résolue, vous pouvez saisir la{" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noreferrer" className="text-sauge-500 underline">CNIL</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
