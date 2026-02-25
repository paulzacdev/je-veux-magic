## Diagnostic

Le modèle `openai/gpt-oss-120b:free` fonctionne correctement (prière générée avec succès), mais la génération de contenu hebdomadaire échoue avec une erreur **429 Rate Limit**. Cela signifie que le modèle est temporairement surchargé sur les serveurs d'OpenRouter.

Ce n'est pas un bug dans le code — c'est une limitation des modèles gratuits qui ont un quota de requêtes limité.

## Solutions possibles

### Option A : Ajouter un mécanisme de retry automatique

Modifier la fonction `generate-content` pour réessayer automatiquement 2-3 fois avec un délai entre chaque tentative (backoff exponentiel). Cela permettrait de gérer les rate limits temporaires sans intervention manuelle.

### Option B : Utiliser un modèle de fallback

Configurer un modèle de secours (par exemple `meta-llama/llama-3.3-70b-instruct:free`) qui prend le relais quand le modèle principal est rate-limité.

### Option C : Utiliser Lovable AI intégré (recommandé)

Utiliser les modèles Lovable AI natifs (comme `google/gemini-2.5-flash`) qui n'ont pas de rate limit et ne nécessitent pas de clé API. Cela garantirait une génération fiable à chaque fois, tout en gardant OpenRouter pour le chatbot si souhaité.

## Plan recommandé : Option A + retry

1. **Ajouter un retry avec backoff** dans `generate-content/index.ts` : si l'API renvoie 429, attendre 5s puis réessayer (max 3 tentatives)
2. **Renvoyer un message clair** au frontend si toutes les tentatives échouent, pour que l'utilisateur puisse réessayer plus tard

## Détails techniques

- Wrapper `fetchWithRetry` autour des appels `fetch` vers OpenRouter
- Délai : 5s, 10s, 15s entre les tentatives
- Le code existant est bien structuré, la modification est localisée aux deux appels `fetch`