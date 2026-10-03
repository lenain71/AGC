/*
 * Configuration Hallo' Village — Halloween 2026
 * ------------------------------------------------------------
 * Tout ce qui change d'une année à l'autre est ici.
 * Les valeurs marquées « À COMPLÉTER » sont provisoires.
 *
 * Construction d'une phrase (parcours.*.phrase) :
 *   - chaque élément est l'id d'un point  -> la lettre de ce point
 *   - " " (espace) ou tout texte qui n'est pas un id de point -> recopié tel quel
 *   - "secret" -> la lettre du point secret
 * En mode debug (?debug=1), la console signale les points jamais utilisés
 * ou utilisés deux fois dans la phrase.
 */
window.AGC = window.AGC || {};

AGC.config = {
    annee: 2026,
    village: "Couternon",
    habitants: 2000,
    centre: [47.3361765, 5.1518826],

    soiree: {
        titre: "Soirée d'Halloween",
        date: "2026-10-31T19:00:00",
        fin: "2026-10-31T22:30:00",
        lieu: "Salle des fêtes",
        adresse: "Couternon",
        coords: [47.3331368, 5.1557851],
        helloasso: "https://www.helloasso.com/", // À COMPLÉTER : lien d'inscription
        description: "Train fantôme sensoriel, défilé des monstres, animations des horreurs et soirée musicale : venez frissonner en famille !",
        services: "Buvette, repas sur place ou à emporter",   // ligne d'info pratique sous le lieu (vide = masquée)
        // Encadré affiché sur la page Soirée, au-dessus du bouton d'inscription (vide = pas d'encadré)
        repas: "Commande des repas obligatoire, sur place ou à emporter : réservez-les lors de votre inscription sur HelloAsso.",
        programme: [                           // heure facultative : sans heure, l'étape s'affiche « puis »
            { heure: "19:00", titre: "Entrée dans la soirée", texte: "Avec le train fantôme sensoriel… frissons garantis !" },
            { titre: "Défilé déguisé des monstres" },
            { titre: "Animation des horreurs" },
            { titre: "Soirée musicale des monstres" }
        ]
    },

    /* Petites astuces affichées sur la page « Chasse des enfants » */
    astuces: [                             // À COMPLÉTER
        { icone: "fa-battery-full", texte: "Charge ton téléphone à fond : le GPS consomme beaucoup de batterie." },
        { icone: "fa-location-crosshairs", texte: "Autorise la localisation quand le navigateur te la demande." },
        { icone: "fa-lightbulb", texte: "Prends une lampe torche et un gilet ou un accessoire lumineux." },
        { icone: "fa-person-walking", texte: "Les enfants restent accompagnés d'un adulte et marchent sur les trottoirs." },
        { icone: "fa-satellite-dish", texte: "Si le GPS est imprécis, reste immobile quelques secondes à découvert." }
    ],

    /* Adresse qui reçoit les propositions de lieux (fichier JSON envoyé par mail) */
    contact: {
        email: "charly.delarche@idea-design.fr"   // provisoire
    },

    /* Lieux fixes ajoutés à la « Carte du village » (en plus du lieu de la soirée et de data/lieux.json).
       Types : maison, hante, evenement — ex. { type: "evenement", nom: "Atelier citrouilles", coords: [47.33, 5.15] } */
    lieux: [],

    parcours: {
        petits: {
            nom: "Chasse des petits",
            public: "Conseillé jusqu'à 5-6 ans",
            description: "Un petit parcours tout près, pour trouver une phrase courte.",
            // 7 citrouilles maximum
            ouverture: "2026-10-31T17:00:00",   // À COMPLÉTER
            couleur: "orange",
            fond: "plan",   // fond de carte par défaut : "plan" (nuit) ou "satellite" ; le joueur peut basculer avec le bouton
            sons: { trouve: ["enfant-trouve-1", "enfant-trouve-2", "enfant-trouve-3"], final: "enfant-final" },   // sons/ : citrouille trouvée (au hasard), phrase complète
            // À COMPLÉTER : phrase courte à choisir ; points provisoires (5 points proches les uns des autres)
            points: {
                "1": { coords: [47.331693, 5.154582], lettre: "B" },
                "2": { coords: [47.332244, 5.154542], lettre: "O" },
                "3": { coords: [47.332224, 5.153939], lettre: "U" },
                "4": { coords: [47.331878, 5.152650], lettre: "H" },
                "5": { coords: [47.331446, 5.152159], lettre: "🎃" }
            },
            secret: null,
            phrase: ["1", "2", "3", "4", " ", "5"]
        },

        grands: {
            nom: "Chasse des grands",
            public: "Enfants — 7 ans et plus",
            description: "Chaque citrouille cache une syllabe : retrouve-les toutes, puis le point secret !",
            ouverture: "2026-10-31T17:00:00",    // À COMPLÉTER
            couleur: "violet",
            fond: "plan",   // fond de carte par défaut : "plan" (nuit) ou "satellite" ; le joueur peut basculer avec le bouton
            sons: { trouve: ["enfant-trouve-1", "enfant-trouve-2", "enfant-trouve-3"], final: "enfant-final" },   // sons/ : citrouille trouvée (au hasard), phrase complète
            // À COMPLÉTER : tracé provisoire = 11 des 19 points de 2025, à valider sur le terrain
            // Chaque point donne une syllabe ; elles sont mélangées pour que l'ordre de marche ne dévoile pas la phrase.
            points: {
                "1":  { coords: [47.331693, 5.154582], lettre: "TROU" },
                "2":  { coords: [47.331878, 5.152650], lettre: "AI" },
                "3":  { coords: [47.334267, 5.154304], lettre: "COR" },
                "4":  { coords: [47.334399, 5.149966], lettre: "LES" },
                "5":  { coords: [47.334338, 5.149016], lettre: "DOUILLE" },
                "6":  { coords: [47.333882, 5.148400], lettre: "CI" },
                "7":  { coords: [47.332713, 5.148748], lettre: "ME" },
                "8":  { coords: [47.334905, 5.148384], lettre: "NE" },
                "9":  { coords: [47.335400, 5.150589], lettre: "IL" },
                "10": { coords: [47.336126, 5.150325], lettre: "BI" },
                "11": { coords: [47.337448, 5.149531], lettre: "LES" }
            },
            secret: { coords: [47.3366272, 5.1588904], lettre: "🎃" },
            // « Cornebidouille aime les citrouilles 🎃 »
            phrase: ["3", "8", "10", "5", " ", "2", "7", " ", "4", " ", "6", "1", "9", "11", " ", "secret"]
        },

        adultes: {
            nom: "Chasse des adultes",
            public: "Nouveauté 2026 — de nuit, pour les parents",
            description: "La nuit tombée, suis les murmures jusqu'aux citrouilles… Les dernières ne se trouvent qu'à l'oreille.",
            // Uniquement de nuit (heure contrôlée avec l'horloge du serveur, pas celle du téléphone)
            ouverture: "2026-10-31T21:00:00",
            fermeture: "2026-11-01T01:00:00",
            couleur: "violet",
            // À COMPLÉTER : lieux différents des enfants ; provisoirement, les 8 points de 2025 non repris par les grands
            points: {
                "1": { coords: [47.3402597, 5.1522895], lettre: "LA", enigme: "À COMPLÉTER : énigme du lieu n°1" },
                "2": { coords: [47.332244, 5.154542],   lettre: "COR", enigme: "À COMPLÉTER : énigme du lieu n°2" },
                "3": { coords: [47.332224, 5.153939],   lettre: "NUIT", enigme: "À COMPLÉTER : énigme du lieu n°3" },
                "4": { coords: [47.331446, 5.152159],   lettre: "DOUILLE", enigme: "À COMPLÉTER : énigme du lieu n°4" },
                "5": { coords: [47.334862, 5.149969],   lettre: "RÔDE", enigme: "À COMPLÉTER : énigme du lieu n°5" },
                "6": { coords: [47.337738, 5.147247],   lettre: "BI", enigme: "À COMPLÉTER : énigme du lieu n°6" },
                "7": { coords: [47.3384608, 5.1449500], lettre: "DANS", enigme: "À COMPLÉTER : énigme du lieu n°7" },
                "8": { coords: [47.3389617, 5.1486665], lettre: "NE", enigme: "À COMPLÉTER : énigme du lieu n°8" }
            },
            // À COMPLÉTER : point final provisoire devant la salle des fêtes
            secret: { coords: [47.3331368, 5.1557851], lettre: "🦇", enigme: "À COMPLÉTER : énigme du point final" },
            // À COMPLÉTER : phrase dérivée provisoire « Cornebidouille rôde dans la nuit 🦇 »
            phrase: ["2", "8", "6", "4", " ", "5", " ", "7", " ", "1", " ", "3", " ", "secret"],
            messageFinal: "Tu as survécu à la nuit de Cornebidouille… Garde cet écran comme preuve de ta bravoure 🦇",

            nuit: {
                audioSeul: 3,       // les 3 dernières cibles restantes disparaissent de la carte : on les trouve au son
                rayonSon: 60,       // m : distance à partir de laquelle on entend la citrouille
                rayonSonAudio: 100, // m : idem, une fois les cibles cachées (pour entendre dès l'entrée dans la zone)
                zone: 120,          // m : rayon de la « zone maudite » affichée autour d'une cible cachée (décalée, la cible n'est pas au centre)
                sonar: { cris: 5, portee: 400, angle: 40, longueur: 120, duree: 3 },  // cris de chauve-souris de la finale ; portée (m) de l'écho ; cône de direction : ouverture (°), longueur (m), durée après l'écho (s)
                rayonFlash: 25,     // m : distance à partir de laquelle le flash clignote (Android)
                intervalles: {      // secondes entre deux sons aléatoires (min, max)
                    etranges: [35, 80],
                    cris: [150, 300]
                },
                intervallesFinale: { // idem pendant la finale (cibles cachées) : la tension monte
                    etranges: [20, 45],
                    cris: [90, 180]
                },
                sons: {             // fichiers de sons/ (sans .mp3) ; ambiance : [fichier, volume]
                    ambiance: [["ambiance-cimetiere", .55], ["ambiance-voix", .22]],
                    murmures: "proche-murmures",
                    coeur: "proche-coeur",
                    etranges: ["etrange-porte", "etrange-rire", "etrange-chouette", "etrange-loup", "etrange-corbeaux",
                               "etrange-chaines", "etrange-derriere-toi", "etrange-cloche", "etrange-rire-homme"],
                    cris: ["cri-femme-1", "cri-femme-2", "cri-aigu", "cri-homme"],
                    trouve: "trouve"
                }
            }
        }
    }
};
