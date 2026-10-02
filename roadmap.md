# SUKULU — ROADMAP DE DÉVELOPPEMENT & SUIVI D'EXÉCUTION

> **Statut global du projet** : En cours de construction  
> **Dépôt officiel** : [https://github.com/Fafagnon/sukulu.git](https://github.com/Fafagnon/sukulu.git)  
> **Dernière mise à jour** : 2 octobre 2026  
> **Phase en cours** : **Phase 2 — Structure Scolaire & Emplois du Temps**  
> **Documents de référence obligatoires** :
> - [rules.md](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/rules.md) : Règles permanentes d'architecture, ingénierie, sécurité et direction artistique (zéro AI slop).
> - [Cahier des charges technique et fonctionnel — SUKULU.md](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/Cahier%20des%20charges%20technique%20et%20fonctionnel%20%E2%80%94%20SUKULU.md) : Spécifications complètes du produit.

---

## 1. Vue d'ensemble & Synthèse d'avancement

| Phase | Intitulé | Statut | Progression |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Socle Technique, Design System & Multi-tenant** | **TERMINÉ** | 100 % |
| **Phase 1** | **Authentification, Onboarding & Contrôle d'Accès** | **TERMINÉ** | 100 % |
| **Phase 2** | **Structure Scolaire & Emplois du Temps** | **EN COURS** | 0 % |
| **Phase 3** | **Communauté & SIS (Élèves, Inscriptions, Parents)** | À FAIRE | 0 % |
| **Phase 4** | **Pédagogie & Moteur Centralisé (Notes, Moyennes, Rangs)** | À FAIRE | 0 % |
| **Phase 5** | **Assiduité & Mode Offline (Appel & Synchronisation)** | À FAIRE | 0 % |
| **Phase 6** | **Trésorerie Scolaire V1 (Frais, Encaissements & Reçus)** | À FAIRE | 0 % |
| **Phase 7** | **Moteur de Bulletins PDF & Circuit de Validation** | À FAIRE | 0 % |
| **Phase 8** | **Espaces Spécifiques, Pilotage, Audit & Recette Pilote** | À FAIRE | 0 % |

---

## 2. Détail des Phases de Développement

### Phase 0 : Socle Technique, Design System & Multi-Tenant
* **Statut** : **TERMINÉ (Validé en production)**
* **Objectif** : Poser une fondation technique pérenne, unifiée et sans dette technique.
* **Livrables réalisés** :
  - [x] Initialisation du projet Next.js 16+ avec TypeScript en mode strict et App Router.
  - [x] Configuration des Design Tokens officiels SUKULU ([src/app/globals.css](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/app/globals.css)) :
    - Bleu nuit profond (`#002B5B`), Orange SUKULU (`#FF6B00`), surfaces neutres ardoise.
    - Zéro emoji, zéro gradient générique, typographie système / Inter.
  - [x] Intégration du logo vectoriel officiel dans [public/logo.svg](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/public/logo.svg).
  - [x] Bibliothèque de composants d'interface atomiques et composites :
    - [src/components/ui/skeleton.tsx](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/components/ui/skeleton.tsx) : Squelettes anti-CLS (`Skeleton`, `TableSkeleton`, `CardSkeleton`, `FormSkeleton`, `PageHeaderSkeleton`).
    - [src/components/ui/button.tsx](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/components/ui/button.tsx) : Boutons avec états (primary, accent, secondary, outline, destructive, ghost, disabled) et spinner `isLoading`.
    - [src/components/ui/badge.tsx](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/components/ui/badge.tsx) : Badges de statuts scolaires (`success`, `warning`, `error`, `info`, `default`, `outline`).
    - [src/components/ui/input.tsx](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/components/ui/input.tsx) : Champ de saisie accessible avec label, description et affichage d'erreur.
    - [src/components/ui/empty-state.tsx](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/components/ui/empty-state.tsx) : Composant d'état vide contextuel guidant avec action.
    - [src/components/ui/toaster.tsx](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/components/ui/toaster.tsx) : Toasts discrets avec support de l'action d'annulation (*Undo*).
  - [x] Schéma PostgreSQL initial et politiques Row Level Security (RLS) ([supabase/migrations/00001_initial_schema.sql](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/supabase/migrations/00001_initial_schema.sql)) :
    - Tables : `schools`, `profiles`, `academic_years`, `periods`, `classes`, `audit_logs`.
    - Fonctions de session RLS : `current_school_id()`, `current_user_role()`.
    - Contrainte d'une seule année scolaire active par établissement.
  - [x] Typage TypeScript de la base de données ([src/types/database.ts](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/types/database.ts)).
  - [x] Clients Supabase configurés pour le navigateur ([src/lib/supabase/client.ts](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/lib/supabase/client.ts)) et le serveur ([src/lib/supabase/server.ts](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/lib/supabase/server.ts)).
  - [x] Écran interactif de validation ([src/app/page.tsx](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/src/app/page.tsx)).
  - [x] Validation du build de production (`npm run build` : 0 erreur).
  - [x] Synchronisation Git sur `https://github.com/Fafagnon/sukulu.git` (commit initial et socle Phase 0).

---

### Phase 1 : Authentification & Onboarding Établissement (Direction Artistique & UX)
* **Statut** : **TERMINÉ (Refonte chirurgicale selon références visuelles)**
* **Objectif** : Fournir une expérience d'entrée fluide et premium : création de compte épurée (Image 2), connexion sécurisée (Image 2) et assistant de configuration d'établissement en 4 étapes (Image 1).
* **Livrables réalisés** :
  - [x] **Composant Shell & Conteneur Mobile-First (`src/components/auth/auth-shell.tsx`)** :
    - Présentation en carte mobile centrée élégante (`max-w-[420px]`, `rounded-[32px]`, ombres douces multi-couches).
    - Barre d'état d'application SUKULU avec indicateur temps réel.
  - [x] **Page de Connexion - "Welcome Back" (`src/app/(auth)/login/page.tsx` - Image 2)** :
    - Badge supérieur bouclier sécurité avec indicateur pilule.
    - Titre "Ravi de vous revoir" et sous-titre de guidage.
    - Saisie Email et Mot de passe avec coins arrondis doux (`rounded-2xl`).
    - Ligne combinée "Se souvenir de moi" et "Mot de passe oublié ?".
    - Bouton principal pleine largeur "Se connecter" aux couleurs SUKULU.
    - Séparateur "Ou" et bouton **Google Sign-In exclusif** (`src/components/auth/google-sign-in-button.tsx`, exclusion stricte d'Apple et Facebook selon directives).
  - [x] **Page de Création de Compte - "Create Account" (`src/app/(auth)/register/page.tsx` - Image 2)** :
    - Illustration profil avec badge "+" orange superposé.
    - Titre "Créer un compte" et formulaire (Nom complet, Email, Mot de passe sécurisé 8+ caractères).
    - Bouton "Créer mon compte" redirigeant directement vers l'assistant d'onboarding.
    - Intégration Google Sign-In exclusive.
  - [x] **Assistant d'Onboarding Établissement en 4 Étapes (`src/app/(auth)/onboarding/page.tsx` - Image 1)** :
    - En-tête avec indicateur "Étape X sur 4", pourcentage dynamique ("XX% complété") et **barre de progression segmentée orange SUKULU (`#FF6B00`)**.
    - Icône hero dans un carré aux coins arrondis doux (`rounded-2xl`) avec fond orangé pastel (`bg-orange-50`).
    - Étape 1 : Choix du type d'établissement via cartes sélectionnables avec surbrillance et bordure orange active (Complexe scolaire, Collège & Lycée, Primaire, Formation).
    - Étape 2 : Nom officiel, sigle court (avec astuce matricules élèves), ville et pays.
    - Étape 3 : Organisation académique (Trimestriel vs Semestriel) et devise (FCFA - XOF / XAF).
    - Étape 4 : Sélection des modules prioritaires (Notes, Assiduité, Caisse, Inscriptions).
    - Bouton "Continuer" orange arrondi et lien secondaire "Passer cette étape" / "Retour".
  - [x] **Actions serveur & Base de données (`src/features/auth/actions.ts`)** :
    - `signUpAction` : création du compte dans `auth.users` et du profil `profiles` (avec `school_id: null` en attente).
    - `submitOnboardingAction` : création atomique de l'établissement dans `schools`, liaison du profil, initialisation de l'année scolaire 2026-2027 et des périodes académiques par défaut.
    - `loginAction` : vérification des identifiants et orientation automatique vers `/onboarding` si l'école n'est pas encore créée.
  - [x] **Middleware & Sécurité des routes (`src/middleware.ts`)** :
    - Protection de `/onboarding` exigeant une session active.
    - Redirection fluide vers `/register` si non authentifié.

---

### Phase 2 : Structure Scolaire & Emplois du Temps
* **Statut** : À FAIRE
* **Objectif** : Configurer la hiérarchie académique complète de l'établissement et planifier les cours.
* **Livrables à réaliser** :
  - [ ] Gestion des Années Scolaires : création, sélection, bascule d'année active (avec règle d'année active unique).
  - [ ] Configuration des Périodes : trimestres ou semestres avec workflow de statuts (`open`, `review`, `locked`).
  - [ ] Organisation pédagogique : Cycles (Primaire, Collège, Lycée), Niveaux, Séries (A, C, D...), Classes et Groupes.
  - [ ] Catalogue des Matières : libellé, code unique, description, statut actif.
  - [ ] Affectations pédagogiques (`class_subjects`) : association matière $\times$ classe $\times$ enseignant $\times$ coefficient.
  - [ ] Emplois du temps (`timetable_slots`) :
    - Saisie des créneaux hebdomadaires (jour, heure début, heure fin, matière, enseignant, salle).
    - Moteur de détection des conflits horaires (enseignant ou classe déjà occupé).
    - Vue emploi du temps par classe et par enseignant.

---

### Phase 3 : Communauté Scolaire & SIS (Élèves, Inscriptions, Parents)
* **Statut** : À FAIRE
* **Objectif** : Gérer la population scolaire, le dossier unique de l'élève et les inscriptions annuelles.
* **Livrables à réaliser** :
  - [ ] Fiche élève complète : matricule unique généré automatiquement (`SUK-YYYY-XXXX`), état civil, photo, statut d'archivage.
  - [ ] Inscriptions annuelles (`enrollments`) : rattachement d'un élève à une classe pour une année scolaire donnée avec conservation de l'historique complet.
  - [ ] Dossier des Responsables Légaux / Parents (`parent_profiles` & `student_parents`) : rattachement de plusieurs enfants à un parent avec indication du contact principal.
  - [ ] Assistant d'Import Excel / CSV en 5 étapes : upload, détection des colonnes, validation stricte, prévisualisation avec rapport d'erreurs, import sécurisé.
  - [ ] Export des listes d'élèves en Excel et CSV.
  - [ ] Gestion des profils Enseignants (`teacher_profiles`).

---

### Phase 4 : Pédagogie & Moteur Centralisé (Notes, Moyennes, Rangs)
* **Statut** : À FAIRE
* **Objectif** : Permettre la saisie des notes et automatiser tous les calculs scolaires sans divergence.
* **Livrables à réaliser** :
  - [ ] Création d'évaluations : titre, type (contrôle continu, composition), date, barème max.
  - [ ] Grille de saisie matricielle des notes avec navigation clavier tableur (Entrée, Tab, Flèches) et mise à jour optimiste.
  - [ ] Moteur de calcul unique et testé unitairement :
    - Moyenne de contrôle continu : $\text{MID} = \text{moyenne}(\text{notes CC})$.
    - Moyenne trimestrielle de la matière : $\text{Moyenne} = \frac{\text{MID} + \text{Composition}}{2}$ (ou $\text{MID}$ si pas de composition).
    - Points de la matière : $\text{Moyenne} \times \text{Coefficient}$.
    - Moyenne générale de l'élève : $\frac{\sum \text{Points}}{\sum \text{Coefficients}}$.
  - [ ] Calcul automatique des rangs selon la règle standard : 1er, 2e, 2e, 4e (`RANK()` en cas d'ex æquo).
  - [ ] Statistiques de classe : moyenne de la classe, plus forte moyenne, plus faible moyenne, taux de réussite.
  - [ ] Workflow de validation et verrouillage de la période :
    - Verrouillage interdisant toute modification par l'enseignant.
    - Procédure de correction exceptionnelle réservée à la Direction avec traçabilité obligatoire dans `audit_logs` (qui, quand, ancienne valeur, nouvelle valeur, motif).

---

### Phase 5 : Assiduité & Mode Offline Enseignant
* **Statut** : À FAIRE
* **Objectif** : Outiller la vie scolaire et permettre aux enseignants de faire l'appel même sans connexion Internet.
* **Livrables à réaliser** :
  - [ ] Écran d'appel par séance / journée : statuts Présent, Absent, Retard, Justifié, Non justifié.
  - [ ] Mode hors-ligne PWA pour l'espace enseignant :
    - Stockage local des classes et élèves via IndexedDB (Dexie.js).
    - File d'attente des appels effectués hors connexion (`outbox`).
    - Synchronisation automatique au retour du réseau avec détection et résolution de conflits.
  - [ ] Micro-interactions haptiques sur mobile (vibration lors de la saisie).
  - [ ] Tableau de bord d'assiduité pour la Direction (absences du jour, retards, alertes).

---

### Phase 6 : Trésorerie Scolaire V1 (Frais, Encaissements & Reçus PDF)
* **Statut** : À FAIRE
* **Objectif** : Assurer le suivi des paiements de scolarité et délivrer les reçus officiels instantanément.
* **Livrables à réaliser** :
  - [ ] Configuration de la grille tarifaire (`fee_structures`) par classe et année (scolarité, inscription, tranches).
  - [ ] Enregistrement des paiements (espèces, virements, dépôts) : gestion des paiements partiels et calcul automatique du reste à payer / solde.
  - [ ] Émission de reçus de paiement PDF générés côté serveur :
    - Numérotation séquentielle unique par école.
    - Mention de l'élève, de la classe, du montant réglé, de la tranche, du solde restant et du caissier.
    - Modale de prévisualisation in-app avec impression directe sans téléchargement parasite.
  - [ ] Suivi des impayés et tableau de bord financier de la Direction.

---

### Phase 7 : Moteur de Bulletins PDF & Circuit de Signature
* **Statut** : À FAIRE
* **Objectif** : Éditer les bulletins scolaires officiels, infalsifiables et prêts pour l'impression.
* **Livrables à réaliser** :
  - [ ] Modèle de bulletin PDF élégant et professionnel (`@react-pdf/renderer`) :
    - En-tête institutionnel complet (pays, ministère, école, logo, coordonnées).
    - Tableau des notes, coefficients, moyennes, rangs et statistiques de classe.
    - Zones d'appréciations (enseignant, conseil de classe, direction).
  - [ ] Circuit de signature numérique et apposition des cachets configurés.
  - [ ] Snapshot historique figé : les données du bulletin validé sont archivées de manière inviolable.
  - [ ] Génération en lot côté serveur : génération de toute une classe en un seul document PDF fusionné ou en archive ZIP.

---

### Phase 8 : Espaces Dédiés, Outils de Pilotage, Audit & Recette Pilote
* **Statut** : À FAIRE
* **Objectif** : Finaliser l'expérience pour chaque profil, vérifier l'étanchéité et livrer l'école pilote au Togo.
* **Livrables à réaliser** :
  - [ ] Dashboard Direction consolidé (KPIs effectifs, finances, assiduité, alertes sans fioritures).
  - [ ] Palette de commandes globale (`Ctrl + K`) pour recherche instantanée d'élèves, de classes et actions rapides.
  - [ ] Portail Parent responsive : consultation stricte en lecture seule des enfants rattachés (notes, rangs, bulletins téléchargeables, retards/absences, état financier).
  - [ ] Journal d'audit complet consultable par la Direction.
  - [ ] Tests de sécurité d'étanchéité multi-tenant (vérification de non-régression RLS).
  - [ ] Alerte post-MVP (Règle #77) pour arbitrer la personnalisation du format des matricules et reçus.

---

## 3. Journal des Itérations et Commits

| Date | Commit Git | Description des livrables |
| :--- | :--- | :--- |
| **02/10/2026** | `2d65e55` | **Initialisation** : Import et scellement du cahier des charges, de rules.md et des assets de marque. |
| **02/10/2026** | `c1fa211` | **Phase 0 terminée** : Initialisation Next.js TypeScript strict, Design Tokens SUKULU, composants UI atomiques, squelettes de chargement anti-CLS, schéma PostgreSQL RLS et laboratoire de test interactif. Build validé (0 erreur). Poussé sur `main`. |
| **02/10/2026** | *(Commit en cours)* | **Phase 1 terminée** : Mise à jour du CDC (authentification & onboarding), création du document maître `roadmap.md`, middleware de protection des routes et sessions, pages `/login` (Suspense), `/register` (onboarding établissement), Server Actions Zod v4, layout partagé avec profil et déconnexion, et dashboards dédiés (`/admin`, `/teacher`, `/parent`). Build validé (0 erreur). |

---

## 4. Consignes pour les Futurs Développeurs / Agents Reprenant le Projet

1. **Ne jamais inventer le métier** : En cas de doute sur une règle scolaire ou financière, consulter [rules.md](file:///c:/Users/HP/Desktop/My%20Projects/sukulu/rules.md) règle #5 et poser la question au responsable.
2. **Respecter scrupuleusement le design system** : Ne jamais ajouter d'émojis dans les interfaces, ni de gradients violet/bleu génériques, ni de cartes décoratives sans fonction métier (Règles #8, #68 et #69 de `rules.md`).
3. **Multi-tenant permanent** : Chaque nouvelle table DOIT comporter `school_id UUID REFERENCES schools(id)` avec politique RLS active.
4. **Mettre à jour ce fichier** : À la fin de chaque étape ou commit majeur, cocher les cases correspondantes dans ce document et renseigner le tableau du journal des itérations.
