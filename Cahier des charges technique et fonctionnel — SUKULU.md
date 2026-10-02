# CAHIER DES CHARGES TECHNIQUE ET FONCTIONNEL
## SUKULU — Logiciel de gestion scolaire

**Version : 1.0**  
**Type : SaaS de gestion scolaire**  
**Cible : établissements scolaires privés et assimilés**  
**Plateformes : Web Administration + PWA/Mobile Enseignant + Portail Parent**  
**Architecture : multi-établissement avec isolation stricte des données**

---

# 1. Présentation du projet

## 1.1. Contexte

Les établissements scolaires utilisent souvent plusieurs outils indépendants pour gérer leurs activités :

- fichiers Excel pour les élèves ;
- fichiers Excel pour les notes ;
- cahiers ou feuilles papier pour les présences ;
- logiciels différents pour la caisse ;
- documents Word pour les bulletins ;
- WhatsApp pour communiquer avec les parents ;
- fichiers dispersés pour les enseignants ;
- archivage manuel des années scolaires.

Cette organisation provoque des doublons, des erreurs de saisie, des pertes de données et une absence de vision globale de l'établissement.

SUKULU a pour objectif de centraliser ces opérations dans une plateforme unique.

Le logiciel doit permettre à la direction d'un établissement de piloter son école depuis une interface web, tandis que les enseignants disposent d'une interface adaptée au smartphone et que les parents peuvent consulter les informations concernant leurs enfants.

---

# 2. Objectifs du logiciel

SUKULU doit permettre de :

1. centraliser les données des élèves ;
2. gérer les inscriptions et réinscriptions ;
3. structurer l'établissement par années scolaires, cycles, niveaux, séries, classes et groupes ;
4. gérer les matières et leurs coefficients ;
5. affecter les enseignants aux matières/classes ;
6. gérer les périodes scolaires ;
7. saisir et gérer les notes ;
8. calculer automatiquement les moyennes ;
9. calculer les classements ;
10. générer les bulletins PDF ;
11. gérer les présences et absences ;
12. suivre les paiements scolaires ;
13. générer des reçus ;
14. suivre les impayés ;
15. fournir des tableaux de bord à la direction ;
16. permettre aux enseignants de travailler depuis leur smartphone ;
17. permettre certaines opérations hors connexion ;
18. permettre aux parents de consulter les informations de leurs enfants ;
19. importer et exporter les données Excel/CSV ;
20. conserver l'historique des années scolaires ;
21. garantir une séparation stricte des données entre établissements ;
22. fournir une base technique évolutive pour de futures fonctionnalités.

---

# 3. Positionnement du produit

SUKULU est conçu comme un SaaS.

Chaque établissement possède son propre environnement logique.

Un établissement ne doit jamais pouvoir accéder aux données d'un autre établissement.

Le logiciel doit donc être conçu dès le départ avec une architecture multi-tenant.

## 3.1. Concept d'établissement

L'entité principale est :

`school`

Elle représente un établissement utilisant SUKULU.

Toutes les données métier doivent être rattachées à un établissement.

Exemple :

```text
School A
 ├── Années scolaires
 ├── Classes
 ├── Élèves
 ├── Enseignants
 ├── Matières
 ├── Notes
 ├── Présences
 └── Paiements

School B
 ├── Années scolaires
 ├── Classes
 ├── Élèves
 ├── Enseignants
 ├── Matières
 ├── Notes
 ├── Présences
 └── Paiements
```

Aucune requête métier ne doit pouvoir retourner des données appartenant à un autre établissement.

---

# 4. Périmètre fonctionnel

## 4.1. Fonctionnalités du MVP

Le MVP doit comprendre :

### Administration

- inscription et création de l'établissement (onboarding école) ;
- connexion unifiée multi-rôles (Direction, Enseignant, Parent) ;
- aiguillage automatique post-connexion selon le rôle de l'utilisateur ;
- réinitialisation et gestion sécurisée des mots de passe ;
- middleware de protection des routes et contrôle d'accès ;
- gestion de l'établissement ;
- gestion des utilisateurs ;
- gestion des rôles ;
- années scolaires ;
- cycles ;
- niveaux/classes ;
- séries ;
- groupes ;
- matières ;
- coefficients ;
- affectation des enseignants ;
- configuration des périodes ;
- paramètres scolaires.

### Élèves

- création d'élève ;
- modification ;
- archivage ;
- recherche ;
- filtres ;
- matricule unique ;
- photo ;
- informations personnelles ;
- informations du parent/tuteur ;
- inscription dans une classe ;
- historique des inscriptions ;
- import Excel/CSV ;
- export Excel/CSV.

### Pédagogie

- création des évaluations ;
- saisie des notes ;
- modification des notes ;
- import des notes ;
- calcul des moyennes ;
- calcul des points ;
- classement ;
- statistiques de classe ;
- validation ;
- verrouillage des périodes ;
- correction exceptionnelle avec traçabilité ;
- génération des bulletins.

### Assiduité

- appel ;
- présence ;
- absence ;
- retard ;
- absence justifiée ;
- absence non justifiée ;
- historique ;
- statistiques.

### Emplois du temps

- planification par créneaux horaires (jour, heure début, heure fin) ;
- association classe, matière, enseignant et salle ;
- affichage de l'emploi du temps par classe ;
- affichage de l'emploi du temps par enseignant ;
- détection et prévention des conflits de créneaux.

### Finance

La V1 comprend une gestion simplifiée de la scolarité :

- configuration des frais ;
- tranches ;
- paiements ;
- paiements partiels ;
- historique ;
- impayés ;
- reçus PDF ;
- espèces.

Les paiements en ligne et intégrations API Mobile Money ne font pas partie du MVP.

### Parent

- connexion ;
- consultation de ses enfants ;
- notes ;
- bulletins ;
- absences ;
- paiements ;
- historique scolaire disponible.

### Documents

- bulletins PDF ;
- reçus PDF ;
- documents avec logo ;
- documents avec signatures ;
- export en lot.

---

# 5. Hors périmètre du MVP

Les fonctionnalités suivantes ne doivent pas être intégrées au MVP initial :

- comptabilité SYSCOHADA complète ;
- grand livre ;
- balance comptable ;
- journaux comptables complets ;
- factures fournisseurs ;
- gestion des immobilisations ;
- paiement en ligne ;
- intégration directe aux API Mobile Money ;
- compte élève ;
- marketplace ;
- gestion de plusieurs établissements depuis un même compte utilisateur ;
- application mobile native obligatoire ;
- fonctionnalités RH complexes ;
- paie ;
- gestion avancée des stocks ;
- intelligence artificielle.

Ces fonctionnalités pourront constituer des versions ultérieures.

---

# 6. Architecture générale

## 6.1. Architecture recommandée

### Backend

**Supabase**

Utilisation de :

- PostgreSQL ;
- Supabase Auth ;
- Supabase Storage ;
- Row Level Security ;
- Edge Functions ;
- Database Functions ;
- Realtime lorsque nécessaire.

### Administration

**Next.js + React + TypeScript**

Avec :

- App Router ;
- TypeScript strict ;
- Tailwind CSS ;
- composants UI réutilisables ;
- formulaires validés côté client et serveur.

### Enseignants

**Flutter**

Déploiement initial :

- Android ;
- PWA.

L'interface enseignant doit être pensée mobile-first.

### Portail parent

Le portail parent peut être intégré à l'application web responsive.

Il n'est pas nécessaire de créer une application mobile native dédiée aux parents pour le MVP.

### PDF

Génération côté serveur via Edge Functions ou service dédié.

La génération ne doit pas dépendre exclusivement du navigateur de l'utilisateur.

---

# 7. Architecture des utilisateurs

Il faut distinguer les utilisateurs de la plateforme et les utilisateurs d'un établissement.

## 7.1. Super administrateur plateforme

Le SuperAdmin SUKULU gère :

- établissements ;
- abonnements ;
- comptes administrateurs ;
- statut des établissements ;
- paramètres globaux ;
- support ;
- configuration SaaS.

Il n'accède aux données scolaires qu'en fonction des droits prévus par le système.

## 7.2. Direction

La Direction possède les droits métier les plus élevés dans son établissement.

Elle peut :

- consulter les données ;
- créer/modifier les élèves ;
- gérer les classes ;
- gérer les enseignants ;
- gérer les matières ;
- gérer les périodes ;
- consulter les notes ;
- valider les notes ;
- verrouiller les périodes ;
- consulter les absences ;
- gérer les paiements ;
- consulter les statistiques ;
- générer les documents ;
- gérer les comptes utilisateurs ;
- gérer les paramètres de l'établissement.

## 7.3. Enseignant

L'enseignant peut :

- consulter ses classes ;
- consulter ses élèves ;
- consulter les matières qui lui sont affectées ;
- créer ses évaluations ;
- saisir ses notes ;
- modifier ses notes tant que la période est ouverte ;
- effectuer les appels ;
- consulter l'historique de ses présences.

Il ne peut pas :

- modifier la structure de l'établissement ;
- modifier les élèves hors de ses classes ;
- modifier les coefficients ;
- modifier les affectations ;
- modifier les paiements ;
- consulter les informations financières globales ;
- modifier une période verrouillée.

## 7.4. Parent

Le parent peut uniquement consulter les données de ses propres enfants :

- identité ;
- classe ;
- notes ;
- moyennes ;
- bulletins ;
- absences ;
- retards ;
- paiements ;
- impayés.

Il ne peut modifier aucune donnée scolaire.

## 7.5. Élève

Aucun compte utilisateur élève dans le MVP.

---

# 8. Gestion des établissements

Table principale :

`schools`

Champs minimum :

```text
id
name
short_name
logo_url
address
city
country
phone
email
website
academic_settings
created_at
updated_at
status
```

Le logiciel doit permettre de configurer :

- nom ;
- logo ;
- coordonnées ;
- devise ;
- langue ;
- format des bulletins ;
- format des reçus ;
- signature ;
- paramètres académiques.

---

# 9. Gestion des années scolaires

Table :

`academic_years`

Exemple :

```text
2026-2027
2027-2028
2028-2029
```

Une année scolaire doit être conservée même lorsqu'elle devient inactive.

Elle ne doit jamais être supprimée simplement parce qu'elle est terminée.

Champs :

```text
id
school_id
name
start_date
end_date
is_active
created_at
```

Une seule année peut être active pour un établissement.

L'historique des anciennes années doit rester consultable.

---

# 10. Structure pédagogique

La structure doit être configurable.

Elle ne doit pas être codée en dur.

Exemple :

```text
Cycle
 └── Niveau
      └── Série
           └── Classe
                └── Groupe
```

Selon l'établissement, certaines couches peuvent être inutilisées.

Exemple :

```text
Collège
 ├── 6ème
 │    ├── 6ème A
 │    └── 6ème B
 └── 5ème
      ├── 5ème A
      └── 5ème B
```

Ou :

```text
Lycée
 └── Terminale
      ├── Série A
      ├── Série C
      └── Série D
```

Le système doit rester suffisamment flexible pour gérer différentes organisations scolaires.

---

# 11. Matières

Table :

`subjects`

Une matière contient :

```text
id
school_id
name
code
description
is_active
```

Exemples :

- Mathématiques ;
- Français ;
- Anglais ;
- SVT ;
- Histoire-Géographie ;
- Physique-Chimie.

---

# 12. Affectation des matières

Une matière n'est pas simplement attachée à une classe.

Il faut une table de liaison :

`class_subjects`

Champs :

```text
id
school_id
class_id
subject_id
teacher_id
coefficient
is_active
```

Cette table permet de dire :

> Dans la classe 3ème A, les Mathématiques sont enseignées par M. X avec un coefficient de 4.

La même matière peut donc avoir :

- un coefficient différent selon la classe ;
- un enseignant différent ;
- des paramètres différents.

---

# 13. Gestion des enseignants

Table :

`teacher_profiles`

Champs possibles :

```text
id
user_id
school_id
employee_number
first_name
last_name
phone
email
photo_url
status
```

Les affectations sont ensuite gérées dans `class_subjects`.

Un enseignant peut donc avoir plusieurs affectations.

Exemple :

```text
Jean Doe
 ├── Mathématiques — 3ème A
 ├── Mathématiques — 3ème B
 └── Physique — 2nde A
```

---

# 14. Gestion des élèves

La fiche élève constitue le cœur du SIS.

Table :

`students`

Champs minimum :

```text
id
school_id
matricule
first_name
last_name
birth_date
gender
photo_url
address
status
created_at
updated_at
```

Le matricule doit être unique à l'intérieur de l'établissement.

Il ne faut pas utiliser le nom/prénom comme identifiant.

Deux élèves peuvent avoir exactement le même nom.

---

# 15. Parents et responsables

Un parent peut avoir plusieurs enfants.

Il ne faut donc pas utiliser uniquement :

```text
students.parent_id
```

comme relation principale.

La structure recommandée est :

```text
users
  ↓
parent_profiles
  ↓
student_parents
  ↓
students
```

Table :

`student_parents`

```text
id
school_id
student_id
parent_id
relationship
is_primary
```

Exemple :

```text
Parent : Kossi Mensah

 ├── Enfant 1 : Ama Mensah
 ├── Enfant 2 : Sena Mensah
 └── Enfant 3 : David Mensah
```

Cela permet également d'avoir plusieurs responsables pour un même élève.

---

# 16. Inscriptions

Un élève ne doit pas être directement lié définitivement à une classe.

Il faut historiser les inscriptions.

Table :

`enrollments`

```text
id
school_id
student_id
academic_year_id
class_id
enrollment_date
status
```

Exemple :

```text
2025-2026 → 6ème A
2026-2027 → 5ème B
2027-2028 → 4ème A
```

Cela permet de reconstruire le parcours scolaire.

---

# 17. Archivage

Un élève ne doit pas être supprimé physiquement lorsqu'il quitte l'établissement.

Utiliser un statut :

```text
active
archived
graduated
transferred
```

L'archivage doit conserver :

- identité ;
- historique scolaire ;
- notes ;
- présences ;
- paiements ;
- documents.

---

# 18. Import Excel / CSV

L'import est une fonctionnalité critique.

Le système doit proposer un assistant d'import en plusieurs étapes.

### Étape 1 — Upload

Formats :

```text
.xlsx
.xls
.csv
```

### Étape 2 — Détection des colonnes

Exemple :

```text
Nom → last_name
Prénom → first_name
Matricule → matricule
Date naissance → birth_date
Sexe → gender
```

### Étape 3 — Validation

Contrôler :

- matricule obligatoire ;
- matricule unique ;
- nom obligatoire ;
- prénom obligatoire ;
- classe existante ;
- année scolaire existante ;
- format des dates ;
- valeurs autorisées ;
- colonnes obligatoires.

### Étape 4 — Prévisualisation

Afficher :

```text
✓ 324 lignes valides
⚠ 7 lignes contenant des erreurs
```

L'utilisateur doit pouvoir télécharger le rapport d'erreurs.

### Étape 5 — Import

Seules les lignes valides sont importées.

Le système ne doit jamais importer silencieusement des données invalides.

---

# 19. Import des notes

Même principe.

Le système doit permettre l'import massif des notes.

Validation :

- élève existant ;
- matricule existant ;
- évaluation existante ;
- note comprise dans la plage autorisée ;
- absence correctement représentée ;
- classe cohérente ;
- matière cohérente.

Les erreurs doivent être affichées avant validation définitive.

---

# 20. Périodes scolaires

Les périodes doivent être configurables.

Le logiciel ne doit pas imposer définitivement "trimestre".

Une école peut fonctionner avec :

```text
Trimestre 1
Trimestre 2
Trimestre 3
```

ou :

```text
Semestre 1
Semestre 2
```

Table :

`periods`

```text
id
school_id
academic_year_id
name
type
order_index
status
start_date
end_date
```

---

# 21. Workflow d'une période

Chaque période suit ce workflow :

```text
OUVERTE
   ↓
SAISIE
   ↓
VALIDATION
   ↓
CLÔTURÉE
   ↓
CORRECTION EXCEPTIONNELLE
```

## Ouverte

Les enseignants peuvent saisir et modifier.

## Validation

L'administration vérifie les données.

## Clôturée

Les enseignants ne peuvent plus modifier les notes.

## Correction exceptionnelle

Une modification peut être autorisée par la Direction.

Chaque correction doit enregistrer :

```text
utilisateur
date
ancienne valeur
nouvelle valeur
raison
élève
matière
évaluation
```

---

# 22. Évaluations

Table :

`evaluations`

```text
id
school_id
class_subject_id
period_id
title
type
date
max_score
created_by
created_at
```

Types configurables, avec au minimum :

```text
controle_continu
composition
```

Le système doit permettre d'ajouter d'autres types ultérieurement.

---

# 23. Notes

Table :

`grades`

```text
id
school_id
evaluation_id
student_id
score
is_absent
absence_reason
created_at
updated_at
```

La note standard est sur 20, mais le système doit idéalement conserver :

```text
score
max_score
```

afin de pouvoir supporter d'autres barèmes.

Exemple :

```text
15 / 20
18 / 20
32 / 40
```

---

# 24. Saisie des notes

L'enseignant sélectionne :

```text
Classe
↓
Matière
↓
Période
↓
Évaluation
```

Le système affiche :

| Élève | Note | Absence |
|---|---:|---|
| Élève A | 15 | Non |
| Élève B | 12 | Non |
| Élève C | — | Oui |

L'interface doit être optimisée pour smartphone.

La sauvegarde doit être automatique.

Une saisie perdue à cause d'une coupure réseau doit être évitée autant que possible.

---

# 25. Fonctionnement hors connexion

L'application enseignant doit pouvoir fonctionner en mode hors connexion pour :

- consulter les classes ;
- consulter les élèves ;
- saisir les notes ;
- effectuer l'appel.

Les données saisies hors connexion doivent être conservées localement.

Lorsque la connexion revient :

```text
Données locales
      ↓
Synchronisation
      ↓
Validation serveur
      ↓
Supabase
```

Le système doit gérer les conflits.

Une donnée déjà modifiée côté serveur ne doit pas être écrasée silencieusement.

---

# 26. Calcul des moyennes

Le moteur de calcul doit être centralisé.

Il ne faut pas dupliquer la logique entre :

- interface ;
- bulletin ;
- dashboard ;
- API.

Une seule source de vérité doit être utilisée.

## 26.1. Moyenne de contrôle continu

Si plusieurs contrôles continus existent :

```text
MID = moyenne(notes de contrôle continu)
```

## 26.2. Moyenne trimestrielle

Selon la règle configurée :

```text
Moyenne = (MID + Composition) / 2
```

Si la composition n'est pas applicable :

```text
Moyenne = MID
```

La règle doit être configurable afin de ne pas bloquer le logiciel si une école applique une autre formule.

---

# 27. Coefficients

Pour chaque matière :

```text
Points = moyenne × coefficient
```

Exemple :

```text
Mathématiques
Moyenne = 14
Coefficient = 4

Points = 14 × 4
       = 56
```

---

# 28. Moyenne générale

```text
Moyenne générale =
Somme(points obtenus)
÷
Somme(coefficients)
```

Le moteur doit exclure correctement les matières non évaluées selon les règles configurées.

Il ne faut jamais traiter une absence de note comme automatiquement égale à zéro sans règle explicite.

---

# 29. Classement

Le classement est calculé à partir de la moyenne générale.

Ordre :

```text
1er
2ème
3ème
...
```

Les ex-aequo doivent être gérés.

Exemple :

```text
1er — 16,50
2ème — 15,80
2ème — 15,80
4ème — 14,90
```

La règle de classement doit être documentée et identique partout dans l'application.

---

# 30. Statistiques de classe

Le système doit calculer :

- moyenne de la classe ;
- meilleure moyenne ;
- dernière moyenne ;
- nombre d'élèves ;
- nombre d'élèves classés ;
- distribution des moyennes ;
- éventuellement taux de réussite selon seuil configuré.

---

# 31. Bulletins

Le bulletin doit être généré côté serveur.

Il doit pouvoir contenir :

- logo ;
- identité de l'école ;
- année scolaire ;
- période ;
- identité de l'élève ;
- matricule ;
- classe ;
- matières ;
- notes ;
- moyennes ;
- coefficients ;
- points ;
- moyenne générale ;
- rang ;
- statistiques ;
- appréciations ;
- signatures ;
- cachet si configuré.

---

# 32. Signature numérique

Le système doit permettre une validation successive.

Workflow :

```text
Enseignant
   ↓
Signature / validation
   ↓
Direction
   ↓
Signature / validation
   ↓
Bulletin final
```

La signature doit être associée à :

- utilisateur ;
- date ;
- heure ;
- document ;
- période.

Une fois le bulletin finalisé, toute modification doit déclencher une nouvelle version du document.

---

# 33. Génération en lot

La Direction doit pouvoir sélectionner :

```text
Classe : 3ème A
Période : Trimestre 1
```

Puis :

```text
Générer les bulletins
```

Le système génère les bulletins des élèves concernés.

Possibilités :

```text
PDF individuel
PDF ZIP
PDF fusionné
```

La génération doit être traitée côté serveur pour éviter de bloquer le navigateur.

---

# 34. Assiduité

Statuts :

```text
Présent
Absent
Retard
Justifié
Non justifié
```

Table :

`attendance_records`

```text
id
school_id
student_id
class_id
date
status
arrival_time
reason
recorded_by
created_at
updated_at
```

---

# 35. Appel enseignant

L'enseignant :

```text
Mes classes
↓
Classe
↓
Date
↓
Appel
```

Il voit la liste des élèves.

Actions rapides :

```text
Présent
Absent
Retard
Justifié
Non justifié
```

L'interface doit minimiser le nombre de clics.

---

# 36. Tableau de bord assiduité

La Direction doit pouvoir consulter :

- absences du jour ;
- retards ;
- absences justifiées ;
- absences non justifiées ;
- élèves les plus absents ;
- classes avec le plus d'absences ;
- évolution des absences ;
- enseignants n'ayant pas encore effectué l'appel.

---

# 37. Gestion financière

La V1 ne constitue pas un logiciel de comptabilité générale.

Elle gère la scolarité et la trésorerie liée aux paiements scolaires.

## 37.1. Frais scolaires

Exemple :

```text
Scolarité annuelle : 150 000 F CFA

Tranche 1 : 50 000
Tranche 2 : 50 000
Tranche 3 : 50 000
```

Table :

`fee_structures`

```text
id
school_id
academic_year_id
class_id
name
amount
```

---

# 38. Paiements

Table :

`payments`

```text
id
school_id
student_id
enrollment_id
amount
payment_date
payment_method
reference
receipt_number
notes
recorded_by
created_at
```

Modes de paiement MVP :

```text
Espèces
```

L'architecture doit néanmoins prévoir l'ajout futur de :

```text
Mobile Money
Virement bancaire
Carte
```

sans devoir refaire le modèle de données.

---

# 39. Paiements partiels

Un élève peut payer une partie de sa scolarité.

Exemple :

```text
Scolarité : 150 000 F
Payé : 75 000 F
Reste : 75 000 F
```

Le système doit calculer automatiquement :

```text
Total dû
Total payé
Solde restant
```

---

# 40. Reçus

Chaque paiement doit pouvoir produire un reçu PDF.

Le reçu contient :

- établissement ;
- logo ;
- numéro du reçu ;
- élève ;
- classe ;
- montant ;
- date ;
- mode de paiement ;
- montant déjà payé ;
- solde restant ;
- utilisateur ayant enregistré le paiement.

Le numéro de reçu doit être unique dans l'établissement.

---

# 41. Tableau de bord financier

La Direction peut consulter :

- total attendu ;
- total encaissé ;
- total restant ;
- nombre de paiements ;
- paiements du jour ;
- paiements du mois ;
- impayés ;
- élèves ayant un solde ;
- répartition des paiements.

---

# 42. Dashboard Direction

Le tableau de bord doit fournir une vision synthétique.

KPI minimum :

```text
Effectif total
Nouvelles inscriptions
Classes
Enseignants
Paiements encaissés
Impayés
Absences du jour
Moyenne générale
```

Les données doivent être filtrables par :

- année scolaire ;
- classe ;
- période.

---

# 43. Graphiques

Prévoir notamment :

- évolution des inscriptions ;
- évolution des encaissements ;
- absences ;
- répartition des élèves ;
- moyennes par classe ;
- distribution des résultats.

Le dashboard ne doit pas devenir une collection de graphiques décoratifs.

Chaque graphique doit répondre à une question de gestion.

---

# 44. Portail parent

Le parent se connecte avec son compte.

Accueil :

```text
Mes enfants
```

Exemple :

```text
Ama Mensah
5ème A

David Mensah
3ème B
```

Pour chaque enfant :

```text
Résumé
Notes
Bulletins
Absences
Paiements
```

Le parent ne doit jamais pouvoir modifier les données.

---

# 45. Sécurité et Row Level Security

La sécurité ne doit pas être uniquement implémentée dans Next.js ou Flutter.

Elle doit également être imposée par PostgreSQL via Supabase RLS.

Principe :

```text
Utilisateur
   ↓
Établissement
   ↓
Rôle
   ↓
Ressource
   ↓
Action autorisée
```

Exemple :

Un enseignant ne doit pouvoir consulter que :

```text
ses classes
+
ses matières
+
les élèves de ses classes
```

Il ne doit pas pouvoir contourner cette restriction en envoyant directement une requête API.

---

# 46. Règles RLS principales

## Direction

Accès complet aux données de son établissement.

## Enseignant

Accès uniquement aux données pédagogiques qui lui sont affectées.

## Parent

Accès uniquement aux données des enfants qui lui sont associés.

## SuperAdmin

Accès selon les privilèges de plateforme.

---

# 47. Journal d'audit

Les opérations sensibles doivent être journalisées.

Table :

`audit_logs`

Champs :

```text
id
school_id
user_id
action
entity_type
entity_id
old_data
new_data
ip_address
created_at
```

Actions importantes :

- modification d'une note ;
- suppression logique ;
- validation ;
- verrouillage d'une période ;
- correction exceptionnelle ;
- modification d'un paiement ;
- modification d'un utilisateur ;
- changement de configuration.

---

# 48. Suppression des données

Éviter les suppressions physiques pour les données sensibles.

Préférer :

```text
soft delete
```

avec :

```text
deleted_at
deleted_by
```

Une suppression définitive doit être extrêmement limitée.

---

# 49. Modèle relationnel principal

Architecture logique :

```text
schools
│
├── users
│   ├── teacher_profiles
│   └── parent_profiles
│
├── academic_years
│   ├── periods
│   ├── classes
│   └── enrollments
│
├── students
│   └── student_parents
│
├── subjects
│
├── class_subjects
│   ├── teacher
│   └── subject
│
├── timetable_slots
│   ├── class
│   ├── teacher
│   └── subject
│
├── evaluations
│   └── grades
│
├── attendance_records
│
├── fee_structures
│
├── payments
│
├── documents
│
└── audit_logs
```

---

# 50. Contraintes d'intégrité

La base doit appliquer les contraintes critiques.

Exemples :

### Matricule

```text
UNIQUE(school_id, matricule)
```

### Année active

Une seule année scolaire active par établissement.

### Inscription

Un élève ne doit pas avoir deux inscriptions actives contradictoires dans la même année.

### Note

Une seule note par :

```text
évaluation + élève
```

sauf fonctionnement explicitement prévu pour plusieurs tentatives.

### Affectation

Une affectation doit être cohérente :

```text
classe
+
matière
+
enseignant
```

---

# 51. Navigation — Administration

Navigation recommandée :

```text
Tableau de bord

Établissement
 ├── Informations
 └── Paramètres

Année scolaire
 ├── Années
 └── Périodes

Structure
 ├── Cycles
 ├── Niveaux
 ├── Séries
 ├── Classes
 ├── Groupes
 └── Matières

Personnel
 └── Enseignants

Élèves
 ├── Tous les élèves
 ├── Inscriptions
 ├── Import
 └── Archives

Pédagogie
 ├── Affectations
 ├── Évaluations
 ├── Notes
 ├── Validation
 ├── Classements
 └── Bulletins

Assiduité
 ├── Aujourd'hui
 ├── Historique
 └── Statistiques

Finance
 ├── Frais
 ├── Paiements
 ├── Impayés
 └── Reçus

Utilisateurs

Journal d'activité
```

---

# 52. Navigation — Enseignant

```text
Accueil

Mes classes

Mes matières

Notes

Présences

Évaluations

Synchronisation

Profil
```

L'interface doit être volontairement beaucoup plus simple que celle de l'administration.

---

# 53. Navigation — Parent

```text
Accueil

Mes enfants

Notes

Bulletins

Absences

Paiements

Profil
```

---

# 54. UX — Principes généraux

L'application doit être :

- simple ;
- rapide ;
- lisible ;
- adaptée aux utilisateurs non techniques ;
- responsive ;
- utilisable sur ordinateur ;
- utilisable sur smartphone pour les enseignants.

Éviter les interfaces excessivement complexes.

La majorité des opérations courantes doivent être réalisables en quelques actions.

---

# 55. Recherche et filtres

Les listes importantes doivent supporter :

- recherche ;
- pagination ;
- tri ;
- filtres ;
- export.

Élèves :

```text
Nom
Prénom
Matricule
Classe
Année
Statut
```

Notes :

```text
Classe
Matière
Période
Évaluation
```

Paiements :

```text
Élève
Classe
Date
Période
Statut
```

---

# 56. Notifications

Le système doit prévoir une architecture permettant ultérieurement :

- notifications internes ;
- email ;
- SMS ;
- WhatsApp.

Cependant, les intégrations de communication externes ne doivent pas bloquer le développement du cœur du MVP.

---

# 57. Stockage des fichiers

Supabase Storage doit être utilisé pour :

- photos élèves ;
- photos enseignants ;
- logos ;
- signatures ;
- bulletins ;
- reçus ;
- autres documents scolaires.

Les fichiers doivent être organisés logiquement par établissement.

Exemple :

```text
schools/{school_id}/students/{student_id}/photo
schools/{school_id}/documents/bulletins/
schools/{school_id}/documents/receipts/
```

Les URLs et permissions doivent être contrôlées.

---

# 58. API et logique métier

Les opérations sensibles doivent être traitées côté serveur.

Exemples :

- calcul des moyennes ;
- classement ;
- génération des bulletins ;
- génération des reçus ;
- validation d'une période ;
- verrouillage ;
- import massif ;
- synchronisation hors ligne.

Le frontend ne doit pas être considéré comme une source de vérité.

---

# 59. Gestion des erreurs

Chaque opération doit retourner une erreur compréhensible.

Exemple :

Mauvais :

```text
Error 23505
```

Correct :

```text
Ce matricule existe déjà dans cet établissement.
```

Pour les imports :

```text
Ligne 42 :
Le matricule "2026-0045" existe déjà.
```

---

# 60. Gestion de la synchronisation offline

Chaque opération offline doit posséder un identifiant local.

Exemple :

```text
local_operation_id
created_at
device_id
sync_status
```

États :

```text
pending
syncing
synced
failed
conflict
```

L'enseignant doit pouvoir voir :

```text
Synchronisé
Synchronisation en cours
3 modifications en attente
Erreur de synchronisation
```

---

# 61. Performance

Le système doit être conçu pour des établissements possédant potentiellement :

- plusieurs centaines d'élèves ;
- plusieurs milliers d'élèves ;
- plusieurs dizaines d'enseignants ;
- plusieurs années scolaires ;
- plusieurs milliers de notes.

Les listes ne doivent pas charger toutes les données simultanément.

Utiliser :

- pagination ;
- index PostgreSQL ;
- requêtes ciblées ;
- cache lorsque nécessaire ;
- traitements asynchrones pour les opérations lourdes.

---

# 62. Indexation PostgreSQL

Prévoir des index sur les colonnes fréquemment utilisées :

```text
school_id
matricule
academic_year_id
class_id
student_id
teacher_id
subject_id
period_id
evaluation_id
payment_date
attendance_date
```

Les index composites doivent être ajoutés selon les requêtes réelles.

---

# 63. Tests

Le projet doit comporter plusieurs niveaux de tests.

## Tests unitaires

Tester :

- calcul des moyennes ;
- coefficients ;
- classement ;
- soldes ;
- validation des notes.

## Tests d'intégration

Tester :

- création d'un élève ;
- inscription ;
- saisie d'une note ;
- génération d'un bulletin ;
- paiement ;
- parent.

## Tests de sécurité

Tester notamment :

```text
Parent A → impossible de voir Parent B
Enseignant A → impossible de voir les classes de Enseignant B
School A → impossible d'accéder aux données de School B
```

Ces tests sont essentiels.

---

# 64. Critères d'acceptation — Élèves

La fonctionnalité est validée si :

- un élève peut être créé ;
- son matricule est unique ;
- il peut être inscrit dans une classe ;
- son parcours est historisé ;
- il peut être archivé ;
- ses données peuvent être exportées ;
- il peut être importé par fichier ;
- les erreurs d'import sont signalées ;
- son parent peut être associé ;
- deux élèves ayant le même nom peuvent exister sans conflit.

---

# 65. Critères d'acceptation — Notes

La fonctionnalité est validée si :

- un enseignant peut sélectionner une classe ;
- sélectionner sa matière ;
- créer une évaluation ;
- saisir les notes ;
- sauvegarder ;
- reprendre la saisie après coupure réseau ;
- modifier une note tant que la période est ouverte ;
- ne plus modifier après verrouillage ;
- calculer les moyennes ;
- calculer les coefficients ;
- calculer le classement ;
- générer le bulletin.

---

# 66. Critères d'acceptation — Assiduité

La fonctionnalité est validée si :

- l'enseignant peut effectuer l'appel ;
- chaque élève reçoit un statut ;
- l'appel est sauvegardé ;
- les données peuvent être saisies offline ;
- la synchronisation fonctionne ;
- la Direction peut consulter les statistiques.

---

# 67. Critères d'acceptation — Finance

La fonctionnalité est validée si :

- les frais peuvent être configurés ;
- un paiement peut être enregistré ;
- plusieurs paiements peuvent être enregistrés ;
- les paiements partiels fonctionnent ;
- le solde est calculé ;
- un reçu PDF est généré ;
- les impayés sont visibles ;
- l'historique est conservé.

---

# 68. Critères d'acceptation — Sécurité

Le projet n'est pas considéré comme terminé tant que :

- l'isolation entre établissements n'est pas vérifiée ;
- les RLS ne sont pas testées ;
- les permissions par rôle ne sont pas testées ;
- les modifications sensibles ne sont pas auditées ;
- les accès aux fichiers ne sont pas sécurisés.

---

# 69. Critères d'acceptation — PDF

Les bulletins doivent :

- être lisibles ;
- respecter le modèle de l'établissement ;
- contenir les bonnes données ;
- calculer correctement les moyennes ;
- afficher le bon classement ;
- afficher les signatures ;
- être générables individuellement ;
- être générables en lot.

Un PDF généré ne doit jamais afficher des données provenant d'un autre élève ou d'une autre classe.

---

# 70. Roadmap de développement

## Phase 0 — Socle technique, Design System & Multi-tenant

- initialisation projet Next.js TypeScript strict ;
- design tokens SUKULU (Bleu nuit, Orange, sans artifice AI) ;
- composants atomiques et composites UI (boutons, inputs, badges, empty states, toasts) ;
- squelettes de chargement spécialisés anti-CLS (TableSkeleton, CardSkeleton, FormSkeleton) ;
- schéma PostgreSQL initial, RLS et fonctions de contexte de session (`current_school_id()`).

## Phase 1 — Authentification, Onboarding & Contrôle d'accès

- flux d'onboarding établissement (création atomique école + compte Direction) ;
- page de connexion unifiée avec gestion d'erreurs et sessions sécurisées ;
- middleware de protection des routes et aiguillage dynamique par rôle (`/admin`, `/teacher`, `/parent`) ;
- réinitialisation de mot de passe et sécurité des sessions.

## Phase 2 — Structure scolaire & Emplois du temps

- années scolaires (activation unique) ;
- périodes (trimestres/semestres avec statuts ouvert/validation/verrouillé) ;
- cycles, niveaux, séries, classes et groupes ;
- catalogue des matières et coefficients par classe ;
- enseignants et affectations pédagogiques ;
- emplois du temps par créneaux horaires (jour, heures, classe, enseignant, salle) avec détection des conflits.

## Phase 3 — SIS

- élèves ;
- parents ;
- inscriptions ;
- archivage ;
- import Excel/CSV ;
- export.

## Phase 4 — Pédagogie

- évaluations ;
- notes ;
- coefficients ;
- moyennes ;
- classement ;
- validation ;
- verrouillage ;
- audit.

## Phase 5 — Bulletins

- moteur de calcul ;
- modèle bulletin ;
- signatures ;
- génération PDF ;
- génération en lot.

## Phase 6 — Assiduité

- appel ;
- absences ;
- retards ;
- statistiques ;
- offline.

## Phase 7 — Finance

- frais ;
- paiements ;
- paiements partiels ;
- soldes ;
- reçus ;
- impayés.

## Phase 8 — Portail parent

- authentification ;
- enfants ;
- notes ;
- bulletins ;
- absences ;
- paiements.

## Phase 9 — Stabilisation

- tests ;
- sécurité ;
- performances ;
- synchronisation ;
- corrections ;
- UX ;
- déploiement.

---

# 71. Architecture cible

```text
                         SUKULU
                            │
              ┌─────────────┴─────────────┐
              │                           │
        Administration               Utilisateurs
              │                           │
          Next.js                 ┌────────┼────────┐
              │                   │        │        │
              │                Teacher   Parent   ...
              │                   │
              │                Flutter
              │                   │
              └───────────┬───────┘
                          │
                       Supabase
                          │
             ┌────────────┼────────────┐
             │            │            │
        PostgreSQL       Auth        Storage
             │
             │
            RLS
             │
       Isolation école
```

---

# 72. Principe fondamental de sécurité

Le logiciel doit fonctionner selon le principe :

> "L'utilisateur ne reçoit jamais plus de données qu'il n'est autorisé à consulter."

La sécurité ne doit donc pas être une couche ajoutée à la fin du projet.

Elle doit faire partie du modèle de données dès le premier jour.

---

# 73. Principe fondamental de fiabilité

Les calculs scolaires doivent être centralisés.

Une moyenne affichée dans :

- le dashboard ;
- la fiche élève ;
- le classement ;
- le bulletin ;
- le portail parent

doit provenir du même moteur de calcul.

Il ne doit jamais exister cinq implémentations différentes du calcul de moyenne.

---

# 74. Principe fondamental de traçabilité

Toute opération pouvant modifier un résultat scolaire ou financier important doit pouvoir répondre à quatre questions :

```text
Qui ?
Quoi ?
Quand ?
Pourquoi ?
```

Cela concerne particulièrement :

- notes ;
- validations ;
- corrections ;
- paiements ;
- paramètres de calcul.

---

# 75. Principe fondamental d'évolutivité

Le MVP doit rester simple, mais les choix techniques doivent permettre d'ajouter ultérieurement :

- comptabilité complète ;
- SMS ;
- WhatsApp ;
- Mobile Money ;
- cartes QR ;
- notifications ;
- gestion RH ;
- gestion des examens ;
- statistiques avancées ;
- application mobile parent ;
- intelligence artificielle.

Ces fonctionnalités ne doivent toutefois pas être développées dans le MVP simplement parce que l'architecture les permet.

---

# 76. Résultat attendu

À la fin du MVP, un établissement doit pouvoir effectuer le parcours complet suivant :

```text
Créer l'établissement
        ↓
Créer l'année scolaire
        ↓
Configurer les périodes
        ↓
Créer les classes
        ↓
Créer les matières
        ↓
Créer les enseignants
        ↓
Affecter les enseignants
        ↓
Importer les élèves
        ↓
Inscrire les élèves
        ↓
Associer les parents
        ↓
Créer les évaluations
        ↓
Saisir les notes
        ↓
Effectuer les appels
        ↓
Calculer les moyennes
        ↓
Valider les résultats
        ↓
Verrouiller la période
        ↓
Générer les bulletins
        ↓
Enregistrer les paiements
        ↓
Générer les reçus
        ↓
Permettre aux parents de consulter
```

Le système doit permettre à la Direction de gérer cet ensemble depuis une interface centralisée, tandis que les enseignants disposent d'une expérience beaucoup plus légère, mobile et adaptée à leur travail quotidien.

---

# 77. Définition du MVP terminé

Le MVP SUKULU est considéré comme fonctionnel lorsque :

1. un établissement peut être créé ;
2. son année scolaire peut être configurée ;
3. sa structure pédagogique peut être créée ;
4. ses enseignants peuvent être créés ;
5. les enseignants peuvent être affectés ;
6. les élèves peuvent être importés ou créés ;
7. les inscriptions sont historisées ;
8. les parents peuvent être associés ;
9. les enseignants peuvent saisir les notes ;
10. les notes peuvent être importées ;
11. les calculs sont automatiques ;
12. les périodes peuvent être validées et verrouillées ;
13. les corrections exceptionnelles sont tracées ;
14. les bulletins peuvent être générés ;
15. les présences peuvent être saisies ;
16. les opérations principales enseignant fonctionnent hors connexion ;
17. les frais scolaires peuvent être configurés ;
18. les paiements peuvent être enregistrés ;
19. les paiements partiels sont supportés ;
20. les reçus peuvent être générés ;
21. les parents peuvent consulter les informations de leurs enfants ;
22. les établissements sont strictement isolés ;
23. les rôles sont strictement respectés ;
24. les opérations sensibles sont auditées ;
25. les données peuvent être exportées ;
26. les emplois du temps par créneaux horaires sont configurables et consultables ;
27. l'ensemble est utilisable sur ordinateur et smartphone.

---

# 78. Règle de conception finale

SUKULU ne doit pas être conçu comme une collection de pages CRUD.

Il doit être conçu autour de trois axes :

```text
ÉLÈVE
   ↓
PARCOURS SCOLAIRE
   ↓
RÉSULTATS / ASSIDUITÉ / FINANCE
```

Le dossier élève constitue le point central.

Tout le reste doit se rattacher à son parcours :

```text
Élève
 ├── Parent(s)
 ├── Inscription
 │    └── Classe
 │         ├── Matières
 │         │    ├── Enseignant
 │         │    └── Évaluations
 │         │         └── Notes
 │         └── Présences
 │
 ├── Paiements
 │
 └── Documents
      ├── Bulletins
      └── Reçus
```

Cette structure permet de conserver une vision cohérente de l'élève pendant toute sa présence dans l'établissement et de conserver son historique après son départ.