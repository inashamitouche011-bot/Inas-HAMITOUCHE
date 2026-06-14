# Directives Système et Règles Métier - inaSuivi

Ce fichier sert d'instructions persistantes de référence pour les agents de codage d'AI Studio. Il stabilise les règles de calcul de l'application et prévient les régressions lors des futures modifications.

## 1. Règles d'Extraction de l'IA (Analyse de Métrés / Situations)
* **Pas d'arrondi dégradé :** Lorsque l'IA analyse un document (PDF ou Excel), elle doit extraire la valeur textuelle physique de la quantité cumulée réalisée (voir le champ `extractedQuantity` dans l'API de traitement).
* **Fidélité physique :** Ne jamais recalculer une quantité à partir d'un pourcentage d'avancement arrondi de manière floue (cela évitera que 15 000 devienne 14999,84). C'est la quantité exacte lue sur le métré qui fait autorité et qui écrase le cumul du tableau.

## 2. Règle Officielle de calcul de l'Avenant
* **Formule stricte :** `Quantité Avenant = Quantité du Mois - Quantité du Marché`.
* **Comportement :** Si la quantité consignée sur le métré (Saisie dans la case Quantité du Mois / Cumulé) est supérieure à la quantité initiale du marché, la différence est affectée automatiquement à la case **Quantité Avenant** (quantité supplémentaire).
* S'il n'y a pas de dépassement, la Quantité Avenant reste à `0`.

## 3. Formatage et Localisation
* **Monnaie :** Tous les montants financiers doivent être formatés en Dinars Algériens (`DA`) avec la locale `fr-DZ` (ex. `1.500.000,00 DA`).
* **Précision :** Les quantités acceptent des décimales précises (`minimumFractionDigits: 2`, `maximumFractionDigits: 2`) pour refléter précisément les métrés de chantier.

## 4. Intégrité des Écrans (Fidélité au métier de Travaux/BTP)
* Ne jamais ajouter des menus ou graphiques non sollicités pouvant alourdir ou désynchroniser l'affichage de suivi financier officiel.
* Les calculs de situation de travaux (Précédent, Mois, Cumulé, Reste à réaliser) doivent toujours être recalculés de façon dynamique à l'aide de la fonction `getRowValues()`.
