# Les Ongles de Doriane — Application Web

Site de réservation en ligne pour un salon de nail art. Inclut un espace client (réservation, profil, réinitialisation de mot de passe), un back-office administrateur complet (planning, rendez-vous, factures, gestion des utilisateurs) et une gestion de factures avec envoi par email.

---

## Sommaire

1. [Architecture](#architecture)
2. [Prérequis](#prérequis)
3. [Variables d'environnement](#variables-denvironnement)
4. [Installation et premier lancement](#installation-et-premier-lancement)
5. [Migrations de base de données](#migrations-de-base-de-données)
6. [Créer le compte administrateur](#créer-le-compte-administrateur)
7. [Pages publiques](#pages-publiques)
8. [Espace administration](#espace-administration)
9. [API backend — endpoints](#api-backend--endpoints)
10. [Connexion sociale (OAuth)](#connexion-sociale-oauth)
11. [Emails transactionnels (Resend)](#emails-transactionnels-resend)
12. [Factures — configuration PDF et TVA](#factures--configuration-pdf-et-tva)
13. [Sauvegardes et restauration](#sauvegardes-et-restauration)
14. [Mode développement local](#mode-développement-local)
15. [Déploiement en production](#déploiement-en-production)
16. [Sécurité et intégration continue](#sécurité-et-intégration-continue)

---

## Architecture

```
┌─────────────┐    HTTPS    ┌────────────────────────────────┐
│   Client    │ ──────────► │  Caddy (reverse proxy + HTTPS) │
│  (browser)  │             └──────────┬─────────────────────┘
└─────────────┘                        │
                          /api/*  ─────┼─────► backend:8000  (FastAPI / Python)
                          /*      ─────┴─────► frontend:3000 (React / Vite)
                                                     │
                                             db:5432 (PostgreSQL 16)
```

| Composant   | Technologie                  | Port interne |
|-------------|------------------------------|-------------|
| `caddy`     | Caddy 2 (HTTPS automatique)  | 80 / 443    |
| `frontend`  | React 18 + Vite + Tailwind   | 3000        |
| `backend`   | FastAPI + SQLAlchemy + Uvicorn | 8000      |
| `db`        | PostgreSQL 16                | 5432        |

> **Important Caddy** : Caddy reçoit les requêtes `/api/*` et les redirige vers le backend en supprimant le préfixe `/api`. Le cookie `refresh_token` doit donc avoir `path="/api/auth"` (chemin vu côté navigateur) et non `/auth`.

---

## Prérequis

- Docker ≥ 24 et Docker Compose v2
- Un nom de domaine pointant vers le serveur (pour HTTPS automatique via Caddy)
- Un compte [Resend](https://resend.com) pour les emails (gratuit jusqu'à 3 000 mails/mois)
- *Optionnel* : comptes Google Cloud Console et Meta Developers pour la connexion sociale

---

## Variables d'environnement

Créer un fichier **`.env`** à la racine du projet. Ce fichier est chargé par les services `backend` et `db`.

```env
# ───────────────────────────────────────────────
# Base de données PostgreSQL
# ───────────────────────────────────────────────

POSTGRES_USER=doriane
POSTGRES_PASSWORD=motdepassefort
POSTGRES_DB=salon_db

# URL de connexion SQLAlchemy (utilise les variables ci-dessus)
DATABASE_URL=postgresql://doriane:motdepassefort@db:5432/salon_db


# ───────────────────────────────────────────────
# Sécurité JWT
# ───────────────────────────────────────────────

# Clé secrète pour les access tokens (15 min)
# Générer avec : python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=remplacez_par_une_cle_aleatoire_de_64_caracteres

# Clé secrète pour les refresh tokens (7 jours)
# Générer avec : python -c "import secrets; print(secrets.token_hex(32))"
REFRESH_SECRET_KEY=remplacez_par_une_autre_cle_aleatoire

# Durées (optionnel — valeurs par défaut indiquées)
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7


# ───────────────────────────────────────────────
# CORS — origines autorisées
# ───────────────────────────────────────────────

# En production, mettre l'URL exacte du frontend
CORS_ORIGINS=https://votre-domaine.fr


# ───────────────────────────────────────────────
# Emails transactionnels — Resend
# ───────────────────────────────────────────────

# Clé API Resend (obtenir sur https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Expéditeur (doit utiliser un domaine vérifié dans Resend)
RESEND_FROM=Les Ongles de Doriane <noreply@votre-domaine.fr>

# Email administrateur pour les notifications de nouveaux RDV
ADMIN_EMAIL=doriane@votre-domaine.fr


# ───────────────────────────────────────────────
# URL du frontend
# ───────────────────────────────────────────────

# Utilisée pour :
#   - Les redirections OAuth (Google, Facebook)
#   - Les liens dans les emails de réinitialisation de mot de passe
FRONTEND_URL=https://votre-domaine.fr


# ───────────────────────────────────────────────
# Connexion sociale OAuth (optionnel)
# ───────────────────────────────────────────────

# Google OAuth 2.0 (Google Cloud Console > Identifiants)
GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://votre-domaine.fr/api/auth/google/callback

# Facebook Login — supprimé (fonctionnalité retirée)


# ───────────────────────────────────────────────
# Informations entreprise (pour les PDFs de factures)
# ───────────────────────────────────────────────

BUSINESS_NAME=Les Ongles de Doriane
BUSINESS_ADDRESS=123 Rue Example, 75000 Paris
BUSINESS_PHONE=06 12 34 56 78
BUSINESS_EMAIL=contact@votre-domaine.fr
BUSINESS_SIRET=000 000 000 00000


# ───────────────────────────────────────────────
# Logs
# ───────────────────────────────────────────────

# Répertoire des fichiers de log dans le container
LOG_DIR=/app/logs
```

### Résumé des variables obligatoires

| Variable | Rôle |
|----------|------|
| `POSTGRES_USER` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base de données |
| `DATABASE_URL` | URL de connexion SQLAlchemy |
| `SECRET_KEY` | Signature des access tokens JWT + tokens de réinitialisation de mot de passe |
| `REFRESH_SECRET_KEY` | Signature des refresh tokens JWT |
| `CORS_ORIGINS` | Origines autorisées pour les requêtes cross-origin |

### Variables optionnelles mais recommandées

| Variable | Rôle |
|----------|------|
| `RESEND_API_KEY` | Envoi d'emails (confirmations RDV, factures, reset mot de passe) |
| `RESEND_FROM` | Adresse expéditeur des emails |
| `ADMIN_EMAIL` | Reçoit la notification à chaque nouveau RDV |
| `FRONTEND_URL` | Indispensable pour OAuth et pour les liens dans les emails de reset |
| `BUSINESS_NAME` | Nom sur les factures PDF (défaut : "Les Ongles de Doriane") |

---

## Installation et premier lancement

```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-repo/salon.git
cd salon

# 2. Créer le fichier .env
cp .env.example .env   # ou créer manuellement (voir section ci-dessus)
# Éditer .env avec vos valeurs

# 3. Construire et démarrer tous les services
docker compose up -d --build

# 4. Vérifier que tout tourne
docker compose ps
docker compose logs backend --tail 30
```

Au premier démarrage, le backend exécute automatiquement `create_db.py` qui :
- Crée toutes les tables (si elles n'existent pas)
- Insère les horaires par défaut (lundi–samedi 9h–19h/18h, dimanche fermé)
- Insère les paramètres globaux par défaut (`home_service_enabled=false`, `home_service_surcharge=0`, `vat_exempt=true`)

---

## Créer le compte administrateur

```bash
docker compose exec backend python seed_admin.py
```

Le script demande interactivement : email, prénom, nom, téléphone (optionnel), mot de passe. Si le compte email existe déjà, il peut être promu admin.

---

## Pages publiques

| URL | Description |
|-----|-------------|
| `/` | Page d'accueil (hero, aperçu prestations, galerie) |
| `/prestations` | Catalogue complet des prestations par catégorie |
| `/galerie` | Galerie photos |
| `/reserver` | Formulaire de réservation (authentification requise) |
| `/connexion` | Connexion (email/mot de passe + Google) |
| `/inscription` | Création de compte |
| `/profil` | Espace client : mes rendez-vous, modifier mes infos |
| `/mot-de-passe-oublie` | Formulaire de réinitialisation de mot de passe (envoi par email) |
| `/reinitialiser-mdp?token=…` | Formulaire de nouveau mot de passe (lien reçu par email, valable 1h) |
| `/mentions-legales` | Mentions légales |
| `/confidentialite` | Politique de confidentialité |

---

## Espace administration

Accessible sur `/admin` — rôle `admin` requis.

| URL | Page | Description |
|-----|------|-------------|
| `/admin/planning` | Planning | Vue calendrier mensuelle des RDV avec détails (heure, client, prestation, prix) |
| `/admin/rendez-vous` | Rendez-vous | Liste complète, confirmation, annulation, création manuelle |
| `/admin/factures` | Factures | Gestion des factures (créer, valider, envoyer, encaisser, télécharger PDF) |
| `/admin/utilisateurs` | Utilisateurs | Liste des comptes clients, bannir/réactiver, réinitialiser MDP, supprimer |
| `/admin/prestations` | Prestations | CRUD des prestations (nom, catégorie, prix, durée, jusqu'à 3 photos) |
| `/admin/galerie` | Galerie | Gestion des photos de la galerie (upload, légende, réordonnancement) |
| `/admin/calendrier` | Calendrier | Horaires hebdomadaires, jours fermés, adresse par jour, prestation à domicile, régime TVA |
| `/admin/parametres` | Paramètres | Adresse générale du salon, téléphone (affichés dans le footer) |

---

## API backend — endpoints

Tous les endpoints sont préfixés `/api` côté navigateur (Caddy strip le préfixe avant de transmettre au backend).

### Authentification — `/auth`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/auth/register` | — | Créer un compte client |
| POST | `/auth/login` | — | Connexion (retourne access token + cookie refresh) |
| POST | `/auth/refresh` | Cookie | Renouveler l'access token |
| POST | `/auth/logout` | Cookie | Déconnexion (supprime le cookie) |
| GET | `/auth/me` | Bearer | Informations du compte connecté |
| PATCH | `/auth/change-password` | Bearer | Changer son mot de passe (ancien + nouveau) |
| GET | `/auth/me/export` | Bearer | Export RGPD de ses données |
| DELETE | `/auth/me` | Bearer | Supprimer son compte (RGPD) |
| POST | `/auth/forgot-password` | — | Demander un lien de réinitialisation (envoi par email, limité 3/min) |
| POST | `/auth/reset-password` | — | Réinitialiser le mot de passe via le token reçu par email (valable 1h) |
| GET | `/auth/users/search` | Admin | Rechercher un client par email |

### Administration des utilisateurs — `/auth/admin`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/auth/admin/users` | Admin | Lister tous les utilisateurs (filtre `?q=` sur nom/email) |
| PATCH | `/auth/admin/users/{id}/ban` | Admin | Désactiver un compte (le user ne peut plus se connecter) |
| PATCH | `/auth/admin/users/{id}/unban` | Admin | Réactiver un compte banni |
| DELETE | `/auth/admin/users/{id}` | Admin | Supprimer un compte + ses rendez-vous |
| POST | `/auth/admin/users/{id}/reset-password` | Admin | Générer un mot de passe temporaire (retourne le MDP en clair, `must_change_password=true`) |

> **Sécurité** : un administrateur ne peut pas être banni, supprimé ou avoir son mot de passe réinitialisé via ces endpoints.

### OAuth — `/auth/google`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/auth/google` | Redirige vers Google pour authentification |
| GET | `/auth/google/callback` | Callback Google (code → token → cookie) |

### Prestations — `/services`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/services` | — | Lister les prestations actives |
| GET | `/services/all` | Admin | Lister toutes les prestations (y compris désactivées) |
| POST | `/services` | Admin | Créer une prestation |
| PUT | `/services/{id}` | Admin | Modifier une prestation |
| PATCH | `/services/{id}` | Admin | Mise à jour partielle (ex: activer/désactiver) |
| DELETE | `/services/{id}` | Admin | Désactiver une prestation |

### Galerie — `/gallery`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/gallery` | — | Lister les photos actives |
| GET | `/gallery/all` | Admin | Lister toutes les photos |
| POST | `/gallery` | Admin | Ajouter une photo |
| PATCH | `/gallery/{id}` | Admin | Modifier (légende, ordre) |
| DELETE | `/gallery/{id}` | Admin | Supprimer |

### Rendez-vous — `/appointments`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/appointments/available-slots` | — | Créneaux disponibles pour une date et durée |
| POST | `/appointments` | Bearer | Créer un RDV (client) |
| GET | `/appointments/me` | Bearer | Mes RDV |
| GET | `/appointments` | Admin | Tous les RDV |
| GET | `/appointments/planning` | Admin | RDV du mois (year + month) |
| POST | `/appointments/admin` | Admin | Créer un RDV manuellement |
| PATCH | `/appointments/{id}/confirm` | Admin | Confirmer |
| PATCH | `/appointments/{id}/cancel` | Admin | Annuler |

### Factures — `/invoices`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/invoices` | Admin | Lister (filtre `?year=&month=`) |
| GET | `/invoices/appointable` | Admin | RDV sans facture (pour la sélection à la création) |
| POST | `/invoices/from-appointment/{appt_id}` | Admin | Créer depuis un RDV |
| GET | `/invoices/{id}` | Admin | Détail d'une facture |
| GET | `/invoices/{id}/pdf` | Admin | Télécharger le PDF |
| PATCH | `/invoices/{id}/validate` | Admin | Valider (draft → validated) |
| POST | `/invoices/{id}/send` | Admin | Envoyer par email avec PDF joint (→ sent) |
| PATCH | `/invoices/{id}/paid` | Admin | Marquer comme payée (→ paid) |
| DELETE | `/invoices/{id}` | Admin | Supprimer (brouillon uniquement) |

**Cycle de vie d'une facture :**
```
draft ──► validated ──► sent ──► paid
  └─────── delete (draft uniquement)
```

### Calendrier / Horaires — `/calendar`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/calendar/working-hours` | — | Horaires hebdomadaires |
| PUT | `/calendar/working-hours/{id}` | Admin | Modifier un jour |
| GET | `/calendar/closed-days` | — | Jours fermés |
| POST | `/calendar/closed-days` | Admin | Ajouter un jour fermé |
| DELETE | `/calendar/closed-days/{id}` | Admin | Supprimer |

### Paramètres — `/settings`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/settings/home-service` | — | État prestation à domicile + supplément |
| PUT | `/settings/home-service` | Admin | Activer/désactiver + modifier le supplément |
| GET | `/settings/vat` | — | Régime TVA (`vat_exempt: true/false`) |
| PUT | `/settings/vat` | Admin | Basculer entre franchise en base et assujetti TVA |
| GET | `/settings/business` | — | Adresse générale + téléphone (affichés dans le footer) |
| PUT | `/settings/business` | Admin | Modifier adresse générale et téléphone |

### Uploads — `/uploads`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/uploads/image` | Admin | Uploader une image (JPEG/PNG/WebP/GIF, max 10 Mo) |

---

## Connexion sociale (OAuth)

> **Note** : La connexion Facebook a été supprimée. Seul Google OAuth est disponible.

### Google

1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un projet > API et services > Identifiants
3. Créer des identifiants OAuth 2.0 (application Web)
4. Ajouter dans **Origines JavaScript autorisées** : `https://votre-domaine.fr`
5. Ajouter dans **URI de redirection autorisés** : `https://votre-domaine.fr/api/auth/google/callback`
6. Copier le **Client ID** et le **Client Secret** dans `.env`

---

## Emails transactionnels (Resend)

1. Créer un compte sur [resend.com](https://resend.com)
2. Ajouter et vérifier votre domaine (Domaines > Ajouter un domaine > suivre les instructions DNS)
3. Créer une clé API (Clés API > Créer une clé)
4. Renseigner dans `.env` :

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM=Les Ongles de Doriane <noreply@votre-domaine.fr>
ADMIN_EMAIL=doriane@votre-domaine.fr
FRONTEND_URL=https://votre-domaine.fr
```

**Emails envoyés automatiquement :**
- À la **création d'un RDV** par un client → notification à l'admin (`ADMIN_EMAIL`)
- À la **confirmation** d'un RDV par l'admin → email au client
- À l'**envoi d'une facture** → email au client avec PDF joint
- Sur **demande de réinitialisation de mot de passe** → lien valable 1h envoyé au client

> Le lien de réinitialisation est construit à partir de `FRONTEND_URL`. S'assurer que cette variable est bien renseignée pour que les emails de reset fonctionnent.

---

## Factures — configuration PDF et TVA

### Informations entreprise sur le PDF

```env
BUSINESS_NAME=Les Ongles de Doriane
BUSINESS_ADDRESS=123 Rue Example, 75000 Paris
BUSINESS_PHONE=06 12 34 56 78
BUSINESS_EMAIL=contact@votre-domaine.fr
BUSINESS_SIRET=000 000 000 00000
```

### Régime TVA

Le régime TVA est configurable depuis **Admin → Calendrier → section "Régime TVA"** :

| Mode | Description |
|------|-------------|
| **Franchise en base** (défaut) | Micro-entrepreneur sous 37 500 € de CA. TVA non facturée. La mention légale *"TVA non applicable, article 293 B du CGI"* est automatiquement ajoutée sur le PDF et dans l'email. |
| **Assujetti à la TVA** | Dépasse le seuil. Le taux de TVA est éditable à la création de chaque facture (défaut : 20 %). |

> Changer ce paramètre n'affecte que les **nouvelles** factures créées après le changement. Les factures existantes conservent leur taux.

**Calcul automatique (mode assujetti) :**
- Prix TTC = montant du rendez-vous
- Montant HT = TTC ÷ (1 + taux/100)
- TVA = TTC − HT

---

## Sauvegardes et restauration

### Sauvegarde manuelle

```bash
# Base de données
docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d).sql

# Uploads (images)
docker run --rm -v fontaine-doriane_uploads_data:/data alpine tar cz /data > uploads_$(date +%Y%m%d).tar.gz
```

### Sauvegarde automatique (cron)

```bash
# Rendre le script exécutable
chmod +x scripts/backup_db.sh

# Ajouter un cron (chaque nuit à 3h)
crontab -e
# Ajouter : 0 3 * * * /chemin/vers/projet/scripts/backup_db.sh >> /var/log/backup_salon.log 2>&1
```

Les backups sont conservés 30 jours dans `/srv/backups/salon/`.

### Restauration

```bash
# Base de données
docker compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB < backup_20260101.sql

# Uploads
docker run --rm -v fontaine-doriane_uploads_data:/data -v $(pwd):/backup alpine \
    tar xzf /backup/uploads_20260101.tar.gz -C /data
```

---

## Mode développement local

```bash
# Démarrer en mode dev (hot-reload frontend et backend)
docker compose up

# Le frontend est accessible sur http://localhost:3000
# Le backend est accessible sur http://localhost:8000
# La base de données est exposée sur localhost:5433

# Logs en temps réel
docker compose logs -f backend
docker compose logs -f frontend
```

En mode dev (`docker-compose.override.yaml`) :
- Frontend : Vite avec hot module replacement
- Backend : le volume monté permet de modifier le code Python sans reconstruire
- Caddy est désactivé (profil `prod`)
- La base de données accepte les connexions sans mot de passe (`trust`)

---

## Déploiement en production

```bash
# Premier déploiement
docker compose up -d --build

# Mise à jour du code
git pull
docker compose up -d --build

# Après une migration de base de données
docker cp scripts/migrate_v3.sql fontaine-doriane-db-1:/tmp/
docker exec fontaine-doriane-db-1 psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/migrate_v3.sql
docker compose up -d --build

# Vérifier l'état des services
docker compose ps
docker compose logs backend --tail 50

# Redémarrer un service spécifique
docker compose restart backend
```

Caddy obtient automatiquement un certificat TLS via Let's Encrypt au premier démarrage (port 80 et 443 doivent être ouverts).

> **Historique Git réécrit le 2026-09-06** : le dépôt est passé public, l'historique
> a été aplati en un seul commit et les photos clientes retirées du suivi Git
> (`backend/static/uploads/` est maintenant dans `.gitignore`, le dossier est
> recréé automatiquement au démarrage du backend). Sur un serveur déjà cloné,
> se resynchroniser avec `git fetch origin && git reset --hard origin/main`.

---

## Sécurité et intégration continue

Le dépôt est **public**. Trois garde-fous automatiques tournent sur chaque *pull
request*, sur `push` vers `main`, et une fois par semaine (lundi 6h UTC) — un
scan hebdomadaire attrape les CVE publiées après coup sur une dépendance qui n'a
pas bougé.

### Workflows GitHub Actions (`.github/workflows/`)

| Workflow | Fichier | Ce qu'il vérifie | Bloquant ? |
|----------|---------|------------------|------------|
| **Audit des dépendances** | `dependency-audit.yml` | `pip-audit` sur `backend/requirements.txt`, `npm audit` sur `frontend/` (deps *runtime* uniquement, `--omit=dev`), `Trivy` (CVE + secrets commités) | ✅ à partir de *high* |
| — même workflow | | `Trivy` durcissement Dockerfile / IaC (conteneur en root, `apt` sans `--no-install-recommends`…) | ⚠️ informatif |
| **Analyse du code (SAST)** | `code-scan.yml` | `Semgrep` OSS — failles dans le code applicatif (injection, path traversal, désérialisation, mauvais usage crypto, patterns FastAPI/React) | ⚠️ informatif *(le temps de trier le premier passage)* |

Pourquoi `npm audit --omit=dev` : la prod est un build statique servi par Caddy,
seules les dépendances runtime finissent dans le bundle livré aux visiteurs. Les
failles des outils de dev (Vite, esbuild : serveur de dev local) restent visibles
via les alertes Dependabot et un `npm audit` complet non bloquant.

### Dependabot (`.github/dependabot.yml`)

- **Alertes** de vulnérabilité + **mises à jour de sécurité** activées côté dépôt.
- **Mises à jour de version** hebdomadaires : `pip` (backend), `npm` (frontend),
  images Docker (backend + frontend), actions GitHub. Les patch/mineur sont
  regroupés en une seule PR par écosystème.

> ℹ️ Le dépôt étant public, la *branch protection* est disponible même en plan
> **Free**. Tant qu'elle n'est pas activée (Settings → Branches → règle sur
> `main` : *Require status checks to pass*), les workflows affichent le résultat
> sur les PR mais **n'empêchent pas** un merge en échec — discipline : ne merger
> que si le CI est vert.

### Lancer les audits en local

```bash
# Backend — CVE des dépendances Python
pip install pip-audit
pip-audit -r backend/requirements.txt

# Frontend — CVE des dépendances npm (ce qui part en prod)
cd frontend && npm audit --omit=dev --audit-level=high

# SAST — failles dans le code
pip install semgrep
semgrep scan --config p/default --config p/python --config p/javascript \
  --config p/react --config p/secrets --error
```

### Ce qui reste à traiter

Suivi dans `reste a faire.txt` à la racine (fichier de travail local, non
suivi par Git) : montées de versions majeures en attente côté Dependabot,
conteneurs à passer en `USER` non-root, `--ignore-vuln` temporaires à retirer
une fois `fastapi`/`starlette` mis à jour.

---

## Structure du projet

```
.
├── Caddyfile                        # Config reverse proxy (HTTPS + routes)
├── docker-compose.yaml              # Config production
├── docker-compose.override.yaml     # Overrides développement
├── .env                             # Variables d'environnement (non versionné)
│
├── backend/
│   ├── main.py                      # Application FastAPI + middlewares
│   ├── create_db.py                 # Création tables + seed initial
│   ├── seed_admin.py                # Script création compte admin
│   ├── database.py                  # Connexion SQLAlchemy
│   ├── dependencies.py              # get_current_user, require_admin
│   ├── email_service.py             # Envoi emails via Resend (RDV, factures, reset MDP)
│   ├── limiter.py                   # Rate limiter (slowapi)
│   ├── requirements.txt             # Dépendances Python
│   ├── entrypoint.sh                # create_db.py puis uvicorn
│   ├── Dockerfile
│   ├── static/uploads/              # Images uploadées (volume Docker)
│   └── modules/
│       ├── users/
│       │   ├── models.py            # Modèle User (email, OAuth, rôle, is_active)
│       │   ├── routes.py            # Auth, reset MDP, gestion admin des comptes
│       │   ├── auth.py              # JWT : access, refresh, reset token (1h)
│       │   └── oauth.py             # OAuth Google uniquement (Facebook supprimé)
│       ├── services/
│       │   ├── models.py            # Modèle Service (jusqu'à 3 images)
│       │   └── routes.py            # CRUD prestations
│       ├── appointments/
│       │   ├── models.py            # Appointment, AppointmentService, WorkingHours, ClosedDay
│       │   └── routes.py            # Réservation, planning, création admin
│       ├── invoices/
│       │   ├── models.py            # Modèle Invoice (draft→validated→sent→paid)
│       │   ├── routes.py            # CRUD factures, envoi email, PDF
│       │   └── pdf.py               # Génération PDF avec fpdf2 + police DejaVu (Unicode)
│       ├── gallery/
│       │   ├── models.py            # Modèle GalleryPhoto
│       │   └── routes.py            # CRUD galerie
│       ├── calendar/
│       │   └── routes.py            # Horaires hebdo, jours fermés
│       ├── settings/
│       │   ├── models.py            # AppSettings (clé/valeur)
│       │   └── routes.py            # Prestation à domicile, régime TVA, infos salon (adresse/tél)
│       └── uploads/
│           └── routes.py            # Upload d'images
│
├── frontend/
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── tailwind.config.js           # Palette sauge (olive/vert forêt)
│   ├── src/
│   │   ├── App.jsx                  # Routeur React + gardes auth/admin
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── utils/
│   │   │   ├── api.js               # Wrapper fetch (JWT + refresh auto + blob)
│   │   │   └── auth.js              # getAccessToken, restoreSession, logout
│   │   ├── layout/
│   │   │   ├── PublicLayout.jsx     # Header + Footer dynamique (horaires, adresse/jour, CTA réserver)
│   │   │   └── DashboardLayout.jsx  # Sidebar admin (Planning, RDV, Factures, Utilisateurs…)
│   │   └── pages/
│   │       ├── Home.jsx             # Accueil (hero, prestations, galerie)
│   │       ├── Prestations.jsx      # Catalogue prestations (carousel 3 images)
│   │       ├── Galerie.jsx          # Galerie photos
│   │       ├── Reservation.jsx      # Formulaire de réservation
│   │       ├── Login.jsx            # Connexion (email + Google + lien reset MDP)
│   │       ├── Register.jsx         # Inscription
│   │       ├── MonProfil.jsx        # Profil client + historique RDV
│   │       ├── MotDePasseOublie.jsx # Formulaire "mot de passe oublié"
│   │       ├── ReinitialiserMdp.jsx # Formulaire nouveau mot de passe (token email)
│   │       ├── MentionsLegales.jsx
│   │       ├── Confidentialite.jsx
│   │       └── admin/
│   │           ├── AdminPlanning.jsx      # Calendrier mensuel des RDV
│   │           ├── AdminRendezVous.jsx    # Gestion des RDV
│   │           ├── AdminFactures.jsx      # Gestion des factures
│   │           ├── AdminUtilisateurs.jsx  # Gestion des comptes (ban, reset, suppression)
│   │           ├── AdminPrestations.jsx   # Gestion des prestations
│   │           ├── AdminGalerie.jsx       # Gestion de la galerie
│   │           ├── AdminCalendrier.jsx    # Horaires + jours fermés + adresse/jour + domicile + TVA
│   │           └── AdminParametres.jsx    # Adresse générale + téléphone (footer)
│
└── scripts/
    ├── migrate_v2.sql               # Migration post-prod initiale
    ├── migrate_v3.sql               # Migration factures
    ├── backup_db.sh                 # Script de backup automatique
    └── restore_db.sh                # Script de restauration
```
