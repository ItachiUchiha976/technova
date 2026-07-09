/* IA Décodée — Le Décodeur de jargon IA
 * Données du glossaire. Définitions pédagogiques, évergreen.
 * Catégories : fondamentaux | llm | usages | technique | ethique
 * Niveaux : debutant | intermediaire | avance
 * "match" = motifs détectés par le décodeur de texte (insensibles aux accents/casse).
 */
const CATEGORIES = {
  fondamentaux: { label: "Les bases", color: "#22d3ee" },
  llm:          { label: "Modèles de langage", color: "#818cf8" },
  usages:       { label: "Usages & outils", color: "#34d399" },
  technique:    { label: "Concepts techniques", color: "#fbbf24" },
  ethique:      { label: "Éthique & sécurité", color: "#f472b6" }
};

const LEVELS = {
  debutant:      "Débutant",
  intermediaire: "Intermédiaire",
  avance:        "Avancé"
};

const TERMS = [
  // ---------- LES BASES ----------
  {
    term: "Intelligence artificielle (IA)",
    cat: "fondamentaux", level: "debutant",
    short: "Des machines qui imitent certaines capacités humaines (comprendre, décider, créer).",
    def: "L'intelligence artificielle regroupe les techniques qui permettent à une machine de réaliser des tâches qu'on associe à l'intelligence humaine : comprendre du langage, reconnaître des images, prendre des décisions, créer du contenu. Ce n'est pas une seule technologie mais une famille de méthodes.",
    example: "Quand ton téléphone reconnaît ton visage ou que ChatGPT répond à une question, c'est de l'IA.",
    match: ["intelligence artificielle", "\\bIA\\b"]
  },
  {
    term: "IA générative",
    cat: "fondamentaux", level: "debutant",
    short: "Une IA qui crée du nouveau contenu : texte, image, voix, vidéo, code.",
    def: "L'IA générative ne se contente pas d'analyser des données existantes : elle en produit de nouvelles. À partir d'une consigne, elle génère un texte, une image, un son ou une vidéo qui n'existaient pas avant, en s'appuyant sur tout ce qu'elle a appris.",
    example: "Demander « dessine un chat astronaute » et obtenir une image inédite, c'est de l'IA générative.",
    match: ["ia generative", "ia générative", "intelligence artificielle generative", "modele generatif", "genai"]
  },
  {
    term: "Machine learning (apprentissage automatique)",
    cat: "fondamentaux", level: "debutant",
    short: "Apprendre à partir d'exemples plutôt qu'avec des règles écrites à la main.",
    def: "Le machine learning est la branche de l'IA où la machine apprend des régularités à partir de nombreux exemples, au lieu de suivre des règles programmées une par une. Plus on lui montre de données, plus elle s'améliore.",
    example: "Pour reconnaître un spam, on montre au modèle des milliers d'e-mails « spam » et « pas spam » : il apprend tout seul à les distinguer.",
    match: ["machine learning", "apprentissage automatique", "apprentissage machine", "\\bml\\b"]
  },
  {
    term: "Deep learning (apprentissage profond)",
    cat: "fondamentaux", level: "intermediaire",
    short: "Du machine learning avec des réseaux de neurones à plusieurs couches.",
    def: "Le deep learning est une forme avancée de machine learning qui utilise des réseaux de neurones empilés en de nombreuses couches (d'où « profond »). Chaque couche apprend des motifs de plus en plus abstraits. C'est ce qui a permis les grands progrès récents de l'IA.",
    example: "La reconnaissance d'objets dans une photo ou la traduction automatique reposent sur le deep learning.",
    match: ["deep learning", "apprentissage profond", "reseau profond"]
  },
  {
    term: "Réseau de neurones",
    cat: "fondamentaux", level: "intermediaire",
    short: "Un modèle inspiré du cerveau, fait de « neurones » connectés qui s'ajustent.",
    def: "Un réseau de neurones artificiels est composé de petites unités de calcul (les « neurones ») reliées entre elles. Chaque connexion a un poids qui se règle pendant l'entraînement. En ajustant ces millions de poids, le réseau apprend à transformer une entrée (un texte, une image) en une sortie utile.",
    example: "Le cerveau d'un modèle comme GPT ou Gemini est un immense réseau de neurones.",
    match: ["reseau de neurones", "reseaux de neurones", "neural network", "reseau neuronal"]
  },
  {
    term: "Algorithme",
    cat: "fondamentaux", level: "debutant",
    short: "Une suite d'étapes précises pour accomplir une tâche.",
    def: "Un algorithme est une recette : une séquence d'instructions pour résoudre un problème ou prendre une décision. En IA, les algorithmes décrivent comment le modèle apprend et comment il calcule ses réponses.",
    example: "L'algorithme qui choisit la prochaine vidéo à te recommander sur YouTube décide ce que tu vois.",
    match: ["algorithme", "algorithmes", "algorithmique"]
  },
  {
    term: "Données d'entraînement (dataset)",
    cat: "fondamentaux", level: "debutant",
    short: "Les exemples montrés au modèle pour qu'il apprenne.",
    def: "Les données d'entraînement sont l'ensemble des exemples (textes, images, sons...) à partir desquels un modèle apprend. Leur quantité et surtout leur qualité déterminent en grande partie ce que le modèle saura faire — et les défauts qu'il reproduira.",
    example: "Un modèle entraîné surtout sur des textes anglais sera meilleur en anglais qu'en français.",
    match: ["donnees d'entrainement", "donnees d entrainement", "jeu de donnees", "dataset", "corpus d'entrainement", "donnees d'apprentissage"]
  },
  {
    term: "Modèle",
    cat: "fondamentaux", level: "debutant",
    short: "Le « cerveau » entraîné qui produit les réponses.",
    def: "En IA, un modèle est le résultat de l'entraînement : un gros fichier de paramètres qui, une fois prêt, peut transformer une question en réponse. Quand tu utilises ChatGPT, tu parles à un modèle.",
    example: "GPT, Claude, Gemini, Mistral, Llama sont des modèles d'IA différents.",
    match: ["modele de langage", "modele d'ia", "modele d ia", "modele d'intelligence artificielle", "modele pre-entraine", "modele de fondation", "modele fondation"]
  },

  // ---------- MODÈLES DE LANGAGE ----------
  {
    term: "LLM (grand modèle de langage)",
    cat: "llm", level: "intermediaire",
    short: "Un modèle géant entraîné sur du texte pour comprendre et écrire.",
    def: "LLM signifie « Large Language Model », grand modèle de langage. C'est un modèle entraîné sur d'énormes quantités de texte pour prédire le mot suivant. À force, il apprend la grammaire, des connaissances et un raisonnement de surface, ce qui lui permet de discuter, résumer ou rédiger.",
    example: "ChatGPT, Claude et Gemini sont des assistants construits sur des LLM.",
    match: ["\\bllm\\b", "\\bllms\\b", "grand modele de langage", "grands modeles de langage", "large language model"]
  },
  {
    term: "Transformer",
    cat: "llm", level: "avance",
    short: "L'architecture qui a rendu possibles les IA modernes comme ChatGPT.",
    def: "Le Transformer est le type de réseau de neurones inventé en 2017 qui équipe la quasi-totalité des IA de langage actuelles. Sa force est le mécanisme d'« attention » : le modèle pèse l'importance de chaque mot par rapport aux autres pour saisir le contexte. Le « T » de GPT veut dire Transformer.",
    example: "Sans l'architecture Transformer, ni ChatGPT ni les générateurs d'images modernes n'existeraient.",
    match: ["transformer", "transformers", "mecanisme d'attention", "self-attention", "attention mechanism"]
  },
  {
    term: "Token",
    cat: "llm", level: "intermediaire",
    short: "Un morceau de texte (souvent un bout de mot) que le modèle manipule.",
    def: "Un token est l'unité de base que lit et produit un modèle de langage : ce n'est pas tout à fait un mot, plutôt un fragment. Un mot courant peut être un seul token, un mot rare en plusieurs. Les modèles facturent et limitent le texte en tokens. En français, comptez environ 750 mots pour 1000 tokens.",
    example: "Le mot « anticonstitutionnellement » est découpé en plusieurs tokens, alors que « le » en est un seul.",
    match: ["token", "tokens", "tokenisation", "jeton de texte"]
  },
  {
    term: "Prompt",
    cat: "llm", level: "debutant",
    short: "La consigne que tu écris à l'IA pour obtenir une réponse.",
    def: "Le prompt est le texte que tu donnes à une IA générative pour la guider : une question, une instruction, un contexte. Plus il est clair et précis, meilleur est le résultat. C'est l'équivalent de bien formuler sa demande.",
    example: "« Résume ce texte en 3 points pour un débutant » est un prompt plus efficace que « résume ».",
    match: ["prompt", "prompts", "invite de commande", "requete a l'ia"]
  },
  {
    term: "Prompt engineering",
    cat: "llm", level: "intermediaire",
    short: "L'art de bien formuler ses consignes pour de meilleurs résultats.",
    def: "Le prompt engineering désigne les techniques pour rédiger des consignes efficaces : donner un rôle à l'IA, des exemples, un format de sortie, des étapes. Bien « prompter » peut transformer une réponse médiocre en réponse excellente, sans changer de modèle.",
    example: "Ajouter « réponds comme un professeur, étape par étape » améliore nettement les explications.",
    match: ["prompt engineering", "ingenierie de prompt", "ingenierie des prompts"]
  },
  {
    term: "Fenêtre de contexte",
    cat: "llm", level: "intermediaire",
    short: "La quantité de texte que l'IA peut « garder en tête » à la fois.",
    def: "La fenêtre de contexte est la mémoire de travail d'un modèle : le volume de texte (en tokens) qu'il peut prendre en compte d'un coup, prompt et réponse compris. Au-delà, il « oublie » le début. Plus elle est grande, plus on peut lui donner de longs documents.",
    example: "Une grande fenêtre de contexte permet de coller un livre entier et de poser des questions dessus.",
    match: ["fenetre de contexte", "contexte du modele", "context window", "longueur de contexte", "taille de contexte"]
  },
  {
    term: "Température",
    cat: "llm", level: "avance",
    short: "Un réglage du niveau de hasard/créativité des réponses.",
    def: "La température contrôle à quel point les réponses d'un modèle sont prévisibles ou variées. Basse, le modèle choisit toujours l'option la plus probable (réponses sûres, répétitives). Haute, il prend plus de risques (réponses créatives, mais parfois farfelues).",
    example: "Pour du code, on met une température basse ; pour un poème original, on la monte.",
    match: ["temperature du modele", "parametre temperature", "reglage temperature"]
  },
  {
    term: "Embedding (plongement)",
    cat: "llm", level: "avance",
    short: "Transformer un mot ou un texte en une liste de nombres qui capte son sens.",
    def: "Un embedding est une représentation d'un texte (ou d'une image) sous forme de vecteur de nombres, placée dans un espace où les choses de sens proche sont proches. C'est ce qui permet à une machine de « mesurer » que « chat » et « chaton » sont similaires.",
    example: "La recherche sémantique et les moteurs de recommandation reposent sur les embeddings.",
    match: ["embedding", "embeddings", "plongement", "plongements", "vecteur semantique", "vectorisation"]
  },
  {
    term: "Fine-tuning (affinage)",
    cat: "llm", level: "avance",
    short: "Réentraîner un modèle existant sur tes propres données pour le spécialiser.",
    def: "Le fine-tuning consiste à prendre un modèle déjà entraîné et à le réentraîner un peu sur un jeu de données ciblé, pour l'adapter à un domaine, un style ou une tâche précise. C'est moins coûteux que de tout entraîner depuis zéro.",
    example: "Affiner un modèle sur tes e-mails passés pour qu'il écrive avec ton ton, c'est du fine-tuning.",
    match: ["fine-tuning", "fine tuning", "finetuning", "affinage", "specialisation du modele", "reentrainement"]
  },
  {
    term: "RAG (génération augmentée par récupération)",
    cat: "llm", level: "avance",
    short: "Brancher l'IA sur une base de documents pour qu'elle réponde avec des sources.",
    def: "RAG (Retrieval-Augmented Generation) combine un modèle de langage avec une recherche dans une base de documents. Avant de répondre, le système va chercher les passages pertinents et les donne au modèle. Résultat : des réponses plus à jour, plus précises et qui citent leurs sources.",
    example: "Un chatbot d'entreprise qui répond à partir de vos PDF internes utilise le RAG.",
    match: ["\\brag\\b", "retrieval augmented generation", "retrieval-augmented", "generation augmentee", "recherche augmentee"]
  },
  {
    term: "Hallucination",
    cat: "llm", level: "debutant",
    short: "Quand l'IA invente une réponse fausse mais énoncée avec assurance.",
    def: "Une hallucination, c'est quand un modèle génère une information inexacte ou inventée tout en paraissant sûr de lui. Cela arrive parce qu'il prédit du texte plausible, sans réelle vérification des faits. D'où l'importance de toujours recouper les informations importantes.",
    example: "Une IA qui cite un livre ou une étude qui n'existe pas est en train d'halluciner.",
    match: ["hallucination", "hallucinations", "hallucine", "halluciner"]
  },
  {
    term: "Paramètres (poids)",
    cat: "llm", level: "avance",
    short: "Les milliards de réglages internes appris par le modèle.",
    def: "Les paramètres (ou poids) sont les valeurs internes que le modèle ajuste pendant l'entraînement ; ils encodent ce qu'il « sait ». On les compte en milliards. Plus de paramètres peut signifier plus de capacité, mais aussi plus de coût — la taille ne fait pas tout.",
    example: "Quand on dit qu'un modèle a « 70 milliards de paramètres », on parle de ces réglages.",
    match: ["parametres du modele", "poids du modele", "milliards de parametres", "nombre de parametres"]
  },
  {
    term: "Inférence",
    cat: "llm", level: "avance",
    short: "Le moment où un modèle déjà entraîné produit une réponse.",
    def: "L'inférence, c'est l'utilisation du modèle : la phase où on lui pose une question et où il calcule la réponse. À distinguer de l'entraînement (la phase d'apprentissage). Chaque réponse que tu reçois consomme du calcul d'inférence.",
    example: "Quand tu envoies un message à ChatGPT, le serveur fait une inférence pour te répondre.",
    match: ["inference", "phase d'inference", "temps d'inference"]
  },
  {
    term: "Raisonnement étape par étape (chain of thought)",
    cat: "llm", level: "intermediaire",
    short: "Pousser l'IA à détailler son raisonnement pour qu'elle se trompe moins.",
    def: "Le « chain of thought » consiste à amener un modèle à dérouler son raisonnement étape par étape avant de conclure, plutôt que de répondre d'un bloc. Les modèles dits « de raisonnement » font ça en interne, ce qui améliore les réponses sur les problèmes complexes (maths, logique).",
    example: "Demander « raisonne étape par étape » améliore souvent la réponse à un problème de maths.",
    match: ["chain of thought", "raisonnement etape par etape", "modele de raisonnement", "modeles de raisonnement", "reasoning model"]
  },

  // ---------- USAGES & OUTILS ----------
  {
    term: "Chatbot (agent conversationnel)",
    cat: "usages", level: "debutant",
    short: "Un programme avec lequel on dialogue en langage naturel.",
    def: "Un chatbot est un logiciel conçu pour converser avec un humain par texte ou par voix. Les chatbots modernes s'appuient sur des LLM, ce qui les rend bien plus naturels et utiles que les anciens robots à réponses pré-écrites.",
    example: "ChatGPT est un chatbot ; le robot du service client d'un site en est un aussi.",
    match: ["chatbot", "chatbots", "agent conversationnel", "robot conversationnel", "assistant conversationnel"]
  },
  {
    term: "Agent IA",
    cat: "usages", level: "intermediaire",
    short: "Une IA qui agit seule : elle planifie et exécute des tâches, pas seulement répond.",
    def: "Un agent IA ne se contente pas de répondre : on lui fixe un objectif et il enchaîne des actions pour l'atteindre — chercher sur le web, utiliser des outils, écrire des fichiers, vérifier son travail. C'est un assistant autonome plutôt qu'un simple répondeur.",
    example: "Un agent à qui on dit « réserve-moi un resto et envoie l'invitation » fait toutes les étapes lui-même.",
    match: ["agent ia", "agents ia", "agent autonome", "agents autonomes", "agentique", "ia agentique"]
  },
  {
    term: "Multimodal",
    cat: "usages", level: "intermediaire",
    short: "Une IA qui comprend/produit plusieurs formats : texte, image, audio, vidéo.",
    def: "Un modèle multimodal sait gérer plusieurs types de contenus en même temps : lire une image, écouter un son, regarder une vidéo et répondre en texte. Cela ouvre des usages comme décrire une photo ou résumer une vidéo.",
    example: "Envoyer une photo de ton frigo et demander une recette : ça nécessite un modèle multimodal.",
    match: ["multimodal", "multimodale", "multimodalite", "multi-modal"]
  },
  {
    term: "Vision par ordinateur",
    cat: "usages", level: "intermediaire",
    short: "Apprendre aux machines à « voir » et comprendre des images.",
    def: "La vision par ordinateur regroupe les techniques permettant à une machine d'analyser des images ou des vidéos : reconnaître des objets, des visages, du texte, détecter des défauts. C'est un domaine clé de l'IA appliquée.",
    example: "Une caisse automatique qui reconnaît tes fruits, ou une voiture qui détecte les piétons.",
    match: ["vision par ordinateur", "computer vision", "reconnaissance d'image", "reconnaissance d'images", "vision artificielle"]
  },
  {
    term: "Reconnaissance vocale (speech-to-text)",
    cat: "usages", level: "debutant",
    short: "Transformer de la parole en texte écrit.",
    def: "La reconnaissance vocale convertit ce qui est dit à voix haute en texte. C'est la brique derrière la dictée, les sous-titres automatiques et les commandes vocales. On l'abrège souvent STT (speech-to-text).",
    example: "Dicter un message au lieu de le taper utilise de la reconnaissance vocale.",
    match: ["reconnaissance vocale", "speech-to-text", "speech to text", "\\bstt\\b", "transcription audio", "transcription automatique"]
  },
  {
    term: "Synthèse vocale (text-to-speech)",
    cat: "usages", level: "debutant",
    short: "Transformer du texte en voix parlée.",
    def: "La synthèse vocale fait l'inverse de la reconnaissance vocale : elle lit un texte à voix haute avec une voix de plus en plus naturelle. On l'abrège TTS (text-to-speech). Les voix générées servent aux assistants, aux livres audio et aux vidéos.",
    example: "Une vidéo « faceless » sans voix humaine utilise une voix de synthèse vocale.",
    match: ["synthese vocale", "text-to-speech", "text to speech", "\\btts\\b", "voix de synthese", "voix generee"]
  },
  {
    term: "Modèle de diffusion (génération d'images)",
    cat: "usages", level: "avance",
    short: "La technique qui crée des images en partant d'un bruit aléatoire.",
    def: "Les modèles de diffusion génèrent des images en partant d'un brouillard de pixels aléatoires qu'ils « débruitent » progressivement jusqu'à former une image cohérente avec ta demande. C'est la méthode derrière la plupart des générateurs d'images actuels.",
    example: "Taper une description et obtenir une illustration repose souvent sur un modèle de diffusion.",
    match: ["modele de diffusion", "modeles de diffusion", "diffusion model", "stable diffusion", "generation d'image", "generation d'images"]
  },
  {
    term: "Deepfake",
    cat: "usages", level: "debutant",
    short: "Un faux audio ou une fausse vidéo très réalistes, créés par IA.",
    def: "Un deepfake est un contenu (image, audio, vidéo) truqué par IA pour faire dire ou faire à quelqu'un ce qu'il n'a jamais dit ou fait. La technologie est devenue si réaliste qu'elle pose de vrais enjeux de désinformation et de fraude.",
    example: "Une fausse vidéo d'une personnalité prononçant un discours qu'elle n'a jamais tenu.",
    match: ["deepfake", "deepfakes", "hypertrucage", "fausse video ia"]
  },
  {
    term: "API",
    cat: "usages", level: "intermediaire",
    short: "Une « prise » qui permet à un logiciel d'utiliser l'IA d'un autre.",
    def: "Une API (interface de programmation) est un moyen pour un programme d'appeler un service à distance. Avec l'API d'un modèle d'IA, un développeur peut intégrer cette IA dans son appli, son site ou son automatisation. La facturation se fait souvent au token.",
    example: "Une application mobile qui ajoute un chatbot appelle l'API d'un modèle comme GPT ou Claude.",
    match: ["\\bapi\\b", "\\bapis\\b", "interface de programmation", "appel d'api"]
  },
  {
    term: "Open source / poids ouverts (open weights)",
    cat: "usages", level: "avance",
    short: "Un modèle qu'on peut télécharger et faire tourner soi-même.",
    def: "Un modèle « à poids ouverts » est mis à disposition pour être téléchargé, utilisé et adapté librement, souvent gratuitement. À l'inverse, un modèle fermé n'est accessible que via le service de son éditeur. Les poids ouverts favorisent le contrôle, la confidentialité et l'innovation.",
    example: "Des modèles comme Llama ou Mistral proposent des versions à poids ouverts.",
    match: ["open source", "poids ouverts", "open weights", "modele ouvert", "modeles ouverts"]
  },

  // ---------- CONCEPTS TECHNIQUES ----------
  {
    term: "Apprentissage supervisé",
    cat: "technique", level: "intermediaire",
    short: "Apprendre à partir d'exemples étiquetés (avec la bonne réponse).",
    def: "Dans l'apprentissage supervisé, on fournit au modèle des exemples accompagnés de la bonne réponse (l'étiquette). Il apprend à reproduire cette correspondance. C'est l'approche la plus courante quand on dispose de données annotées.",
    example: "Donner 10 000 photos étiquetées « chat » ou « chien » pour apprendre à les distinguer.",
    match: ["apprentissage supervise", "supervised learning"]
  },
  {
    term: "Apprentissage non supervisé",
    cat: "technique", level: "avance",
    short: "Trouver des structures dans les données sans étiquettes.",
    def: "Dans l'apprentissage non supervisé, le modèle reçoit des données sans réponses fournies et doit découvrir lui-même des regroupements ou des motifs. Utile pour segmenter des clients ou détecter des anomalies.",
    example: "Regrouper automatiquement des clients aux comportements similaires, sans catégories prédéfinies.",
    match: ["apprentissage non supervise", "unsupervised learning", "clustering"]
  },
  {
    term: "Apprentissage par renforcement",
    cat: "technique", level: "avance",
    short: "Apprendre par essais-erreurs avec des récompenses.",
    def: "L'apprentissage par renforcement entraîne un agent à prendre des décisions en le récompensant pour les bonnes et en le pénalisant pour les mauvaises. À force d'essais, il découvre une stratégie efficace. Très utilisé pour les jeux et la robotique.",
    example: "Une IA qui apprend à jouer aux échecs en jouant des millions de parties contre elle-même.",
    match: ["apprentissage par renforcement", "reinforcement learning", "\\brl\\b"]
  },
  {
    term: "RLHF (renforcement par retour humain)",
    cat: "technique", level: "avance",
    short: "Aligner un modèle sur les préférences humaines grâce à leurs notes.",
    def: "Le RLHF (apprentissage par renforcement à partir de retours humains) affine un modèle en utilisant les préférences de personnes qui comparent et notent ses réponses. C'est en grande partie ce qui rend les assistants modernes utiles, polis et plus sûrs.",
    example: "C'est grâce au RLHF qu'un assistant apprend à refuser poliment une demande dangereuse.",
    match: ["\\brlhf\\b", "renforcement par retour humain", "reinforcement learning from human feedback", "retour humain"]
  },
  {
    term: "Surapprentissage (overfitting)",
    cat: "technique", level: "avance",
    short: "Quand un modèle apprend trop par cœur et généralise mal.",
    def: "Le surapprentissage survient quand un modèle colle tellement à ses données d'entraînement qu'il en mémorise les détails et le bruit, au lieu d'apprendre des règles générales. Résultat : excellent sur les exemples connus, mauvais sur des cas nouveaux.",
    example: "Un élève qui apprend les corrigés par cœur mais échoue dès que l'énoncé change : c'est de l'overfitting.",
    match: ["surapprentissage", "overfitting", "sur-apprentissage"]
  },
  {
    term: "Benchmark",
    cat: "technique", level: "intermediaire",
    short: "Un test standard pour comparer les performances des modèles.",
    def: "Un benchmark est une épreuve normalisée (questions de maths, de code, de culture générale...) sur laquelle on évalue et compare les modèles. Utile pour situer les progrès, mais à prendre avec recul : un bon score à un test ne garantit pas l'utilité réelle.",
    example: "Les classements qui annoncent « le modèle X bat le modèle Y » s'appuient sur des benchmarks.",
    match: ["benchmark", "benchmarks", "test de performance", "banc d'essai"]
  },
  {
    term: "GPU (carte graphique)",
    cat: "technique", level: "intermediaire",
    short: "Le matériel ultra-rapide pour calculs parallèles qui fait tourner l'IA.",
    def: "Un GPU (processeur graphique) excelle à faire un grand nombre de calculs simultanément, ce qui est exactement ce dont l'IA a besoin pour entraîner et exécuter des réseaux de neurones. La course à l'IA est aussi une course aux GPU.",
    example: "Entraîner un grand modèle peut mobiliser des milliers de GPU pendant des semaines.",
    match: ["\\bgpu\\b", "\\bgpus\\b", "carte graphique", "processeur graphique", "\\btpu\\b"]
  },
  {
    term: "Quantization (quantification)",
    cat: "technique", level: "avance",
    short: "Compresser un modèle pour qu'il pèse moins et tourne sur du matériel modeste.",
    def: "La quantization réduit la précision des nombres qui composent un modèle (par exemple de 16 à 4 bits). Le modèle devient bien plus léger et rapide, avec une perte de qualité souvent minime. C'est ce qui permet de faire tourner une IA sur un simple PC ou un téléphone.",
    example: "Une version quantifiée d'un modèle peut tourner en local sur un ordinateur portable.",
    match: ["quantization", "quantification", "quantisation", "modele quantifie"]
  },

  // ---------- ÉTHIQUE & SÉCURITÉ ----------
  {
    term: "Biais algorithmique",
    cat: "ethique", level: "intermediaire",
    short: "Quand l'IA reproduit ou amplifie des préjugés présents dans ses données.",
    def: "Un biais algorithmique apparaît quand un modèle, à cause de données déséquilibrées ou de préjugés présents dans son entraînement, produit des résultats injustes ou discriminatoires. Identifier et corriger ces biais est un enjeu majeur d'une IA responsable.",
    example: "Un outil de tri de CV qui défavorise un genre parce que les données passées étaient biaisées.",
    match: ["biais algorithmique", "biais de l'ia", "biais des donnees", "\\bbiais\\b"]
  },
  {
    term: "Alignement",
    cat: "ethique", level: "avance",
    short: "Faire en sorte que l'IA agisse selon nos intentions et nos valeurs.",
    def: "L'alignement désigne l'effort pour que les objectifs et le comportement d'une IA correspondent vraiment à ce que veulent les humains, y compris en matière de sécurité et d'éthique. Plus les modèles deviennent puissants, plus l'alignement est crucial.",
    example: "Empêcher un modèle d'aider à fabriquer une arme tout en restant utile relève de l'alignement.",
    match: ["alignement", "alignement de l'ia", "ai alignment", "modele aligne"]
  },
  {
    term: "Jailbreak",
    cat: "ethique", level: "intermediaire",
    short: "Contourner les garde-fous d'une IA pour lui faire dire l'interdit.",
    def: "Un jailbreak est une astuce de formulation qui pousse un modèle à ignorer ses règles de sécurité et à produire un contenu normalement bloqué. Les éditeurs corrigent ces failles en continu ; c'est un jeu du chat et de la souris.",
    example: "Déguiser une demande interdite en « jeu de rôle » pour contourner les filtres est un jailbreak.",
    match: ["jailbreak", "jailbreaking", "contournement des garde-fous", "contourner les filtres"]
  },
  {
    term: "AGI (intelligence artificielle générale)",
    cat: "ethique", level: "avance",
    short: "Une IA hypothétique aussi polyvalente que l'humain sur toutes les tâches.",
    def: "L'AGI désigne une IA capable de comprendre et d'apprendre n'importe quelle tâche intellectuelle aussi bien qu'un humain, et pas seulement des tâches spécialisées. Elle n'existe pas aujourd'hui ; son arrivée éventuelle et ses délais font l'objet de vifs débats.",
    example: "Les IA actuelles sont « étroites » (excellentes sur des tâches précises) ; l'AGI serait polyvalente.",
    match: ["\\bagi\\b", "intelligence artificielle generale", "artificial general intelligence", "ia generale"]
  },
  {
    term: "Filigrane IA (watermark)",
    cat: "ethique", level: "intermediaire",
    short: "Une marque invisible pour signaler qu'un contenu a été généré par IA.",
    def: "Un filigrane IA est un signal discret intégré dans une image, une vidéo ou un texte généré, afin de pouvoir détecter plus tard qu'il vient d'une IA. C'est l'une des pistes pour lutter contre la désinformation et les deepfakes.",
    example: "Certaines images générées contiennent un filigrane invisible identifiant l'outil qui les a créées.",
    match: ["filigrane", "watermark", "watermarking", "marquage des contenus ia"]
  }
];
