# Les Ongles de Doriane — Application Web

Site de réservation en ligne pour un salon de nail art. Inclut un espace client (réservation, profil), un back-office administrateur complet, et une gestion de factures avec envoi par email.

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
12. [Factures — configuration PDF](#factures--configuration-pdf)
13. [Sauvegardes et restauration](#sauvegardes-et-restauration)
14. [Mode développement local](#mode-développement-local)
15. [Déploiement en production](#déploiement-en-production)

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
# Connexion sociale OAuth (optionnel)
# ───────────────────────────────────────────────

# URL du frontend (utilisée pour les redirections OAuth)
FRONTEND_URL=https://votre-domaine.fr

# Google OAuth 2.0 (Google Cloud Console > Identifiants)
GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://votre-domaine.fr/api/auth/google/callback

# Facebook Login (Meta Developers > Paramètres > OAuth)
FACEBOOK_CLIENT_ID=000000000000000
FACEBOOK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FACEBOOK_REDIRECT_URI=https://votre-domaine.fr/api/auth/facebook/callback


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
| `SECRET_KEY` | Signature des access tokens JWT |
| `REFRESH_SECRET_KEY` | Signature des refresh tokens JWT |
| `CORS_ORIGINS` | Origines autorisées pour les requêtes cross-origin |

### Variables optionnelles mais recommandées

| Variable | Rôle |
|----------|------|
| `RESEND_API_KEY` | Envoi d'emails (confirmations RDV, factures) |
| `RESEND_FROM` | Adresse expéditeur des emails |
| `ADMIN_EMAIL` | Reçoit la notification à chaque nouveau RDV |
| `FRONTEND_URL` | Indispensable pour OAuth (redirections après login social) |
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
- Insère les paramètres globaux par défaut

---

## Migrations de base de données

Les migrations sont idempotentes (peuvent être rejouées sans risque).

### Migration v2 — fonctionnalités post-prod initiale

```bash
docker cp scripts/migrate_v2.sql fontaine-doriane-db-1:/tmp/
docker exec fontaine-doriane-db-1 psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/migrate_v2.sql
```

Ajoute :
- Colonne `address` sur `working_hours` (adresse par jour de travail)
- Colonnes `is_home_service`, `client_address`, `home_service_surcharge` sur `appointments`
- Table `app_settings` avec données initiales
- Colonnes `image_url_2`, `image_url_3` sur `services`
- Colonnes `google_id`, `facebook_id` sur `users` + `hashed_password` nullable

### Migration v3 — gestion des factures

```bash
docker cp scripts/migrate_v3.sql fontaine-doriane-db-1:/tmp/
docker exec fontaine-doriane-db-1 psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/migrate_v3.sql
```

Ajoute :
- Table `invoices` (factures liées aux rendez-vous)

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
| `/connexion` | Connexion (email/mot de passe + Google + Facebook) |
| `/inscription` | Création de compte |
| `/profil` | Espace client : mes rendez-vous, modifier mes infos |
| `/mentions-legales` | Mentions légales |
| `/confidentialite` | Politique de confidentialité |

---

## Espace administration

Accessible sur `/admin` — rôle `admin` requis.

| URL | Page | Description |
|-----|------|-------------|
| `/admin/planning` | Planning | Vue calendrier mensuelle des RDV avec détails (heure, client, prestation, prix) |
| `/admin/rendez-vous` | Rendez-vous | Liste complète, confirmation, annulation, création manuelle |
| `/admin/factures` | Factures | Gestion des factures (créer, valider, envoyer, encaisser) |
| `/admin/prestations` | Prestations | CRUD des prestations (nom, catégorie, prix, durée, jusqu'à 3 photos) |
| `/admin/galerie` | Galerie | Gestion des photos de la galerie (upload, légende, réordonnancement) |
| `/admin/calendrier` | Calendrier | Configuration des horaires hebdomadaires, jours fermés, adresse par jour, prestation à domicile |

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
| PATCH | `/auth/me` | Bearer | Modifier ses informations |
| DELETE | `/auth/me` | Bearer | Supprimer son compte |

### OAuth — `/auth/google` et `/auth/facebook`

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/auth/google` | Redirige vers Google pour authentification |
| GET | `/auth/google/callback` | Callback Google (code → token → cookie) |
| GET | `/auth/facebook` | Redirige vers Facebook pour authentification |
| GET | `/auth/facebook/callback` | Callback Facebook |

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

### Uploads — `/uploads`

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/uploads/image` | Admin | Uploader une image (JPEG/PNG/WebP/GIF, max 10 Mo) |

---

## Connexion sociale (OAuth)

### Google

1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un projet > API et services > Identifiants
3. Créer des identifiants OAuth 2.0 (application Web)
4. Ajouter dans **Origines JavaScript autorisées** : `https://votre-domaine.fr`
5. Ajouter dans **URI de redirection autorisés** : `https://votre-domaine.fr/api/auth/google/callback`
6. Copier le **Client ID** et le **Client Secret** dans `.env`

### Facebook / Meta

1. Aller sur [Meta for Developers](https://developers.facebook.com)
2. Mes Apps > Créer une application > Type : Consommateur
3. Ajouter le produit **Facebook Login**
4. Paramètres > OAuth du client > Ajouter dans **URI de redirection OAuth valides** :
   `https://votre-domaine.fr/api/auth/facebook/callback`
5. Copier l'**ID de l'application** et la **Clé secrète** dans `.env`
6. Passer l'app en mode **Live** pour que les vrais utilisateurs puissent se connecter

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
```

**Emails envoyés automatiquement :**
- À la **création d'un RDV** par un client → notification à l'admin
- À la **confirmation** d'un RDV par l'admin → email au client
- À l'**envoi d'une facture** → email au client avec PDF joint

---

## Factures — configuration PDF

Les informations de l'entreprise apparaissant sur les factures PDF sont configurées via des variables d'environnement :

```env
BUSINESS_NAME=Les Ongles de Doriane
BUSINESS_ADDRESS=123 Rue Example, 75000 Paris
BUSINESS_PHONE=06 12 34 56 78
BUSINESS_EMAIL=contact@votre-domaine.fr
BUSINESS_SIRET=000 000 000 00000
```

**TVA :** le taux est choisi à la création de chaque facture (défaut 20 %). Mettre 0 pour un régime de TVA non applicable (auto-entrepreneur sous seuil).

**Calcul automatique :**
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
│   ├── email_service.py             # Envoi emails via Resend
│   ├── limiter.py                   # Rate limiter (slowapi)
│   ├── requirements.txt             # Dépendances Python
│   ├── entrypoint.sh                # create_db.py puis uvicorn
│   ├── Dockerfile
│   ├── static/uploads/              # Images uploadées (volume Docker)
│   └── modules/
│       ├── users/
│       │   ├── models.py            # Modèle User (email, OAuth, rôle)
│       │   ├── routes.py            # Auth : login, register, refresh, profil
│       │   ├── auth.py              # JWT : création, décodage, bcrypt
│       │   └── oauth.py             # OAuth Google + Facebook
│       ├── services/
│       │   ├── models.py            # Modèle Service (jusqu'à 3 images)
│       │   └── routes.py            # CRUD prestations
│       ├── appointments/
│       │   ├── models.py            # Appointment, AppointmentService, WorkingHours, ClosedDay
│       │   └── routes.py            # Réservation, planning, création admin
│       ├── invoices/
│       │   ├── models.py            # Modèle Invoice (draft→validated→sent→paid)
│       │   ├── routes.py            # CRUD factures, envoi email, PDF
│       │   └── pdf.py               # Génération PDF avec fpdf2
│       ├── gallery/
│       │   ├── models.py            # Modèle GalleryPhoto
│       │   └── routes.py            # CRUD galerie
│       ├── calendar/
│       │   └── routes.py            # Horaires hebdo, jours fermés
│       ├── settings/
│       │   ├── models.py            # AppSettings (clé/valeur)
│       │   └── routes.py            # Prestation à domicile
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
│   │   │   ├── PublicLayout.jsx     # Header public (logo, nav, Instagram)
│   │   │   └── DashboardLayout.jsx  # Sidebar admin
│   │   └── pages/
│   │       ├── Home.jsx             # Accueil (hero, prestations, galerie)
│   │       ├── Prestations.jsx      # Catalogue prestations (carousel 3 images)
│   │       ├── Galerie.jsx          # Galerie photos
│   │       ├── Reservation.jsx      # Formulaire de réservation
│   │       ├── Login.jsx            # Connexion (email + Google + Facebook)
│   │       ├── Register.jsx         # Inscription (email + Google + Facebook)
│   │       ├── MonProfil.jsx        # Profil client + historique RDV
│   │       ├── MentionsLegales.jsx
│   │       ├── Confidentialite.jsx
│   │       └── admin/
│   │           ├── AdminPlanning.jsx    # Calendrier mensuel des RDV
│   │           ├── AdminRendezVous.jsx  # Gestion des RDV
│   │           ├── AdminFactures.jsx    # Gestion des factures
│   │           ├── AdminPrestations.jsx # Gestion des prestations
│   │           ├── AdminGalerie.jsx     # Gestion de la galerie
│   │           └── AdminCalendrier.jsx  # Horaires + jours fermés + paramètres
│
└── scripts/
    ├── migrate_v2.sql               # Migration post-prod initiale
    ├── migrate_v3.sql               # Migration factures
    ├── backup_db.sh                 # Script de backup automatique
    └── restore_db.sh                # Script de restauration
```
