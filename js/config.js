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
        date: "2026-10-31T18:30:00",           // À COMPLÉTER
        lieu: "Salle des fêtes",
        adresse: "Couternon",
        coords: [47.3331368, 5.1557851],
        helloasso: "https://www.helloasso.com/", // À COMPLÉTER : lien d'inscription
        description: "Défilé costumé, chasse aux citrouilles, musique, maquillage et surprises pour petits et grands !", // À COMPLÉTER
        programme: [                           // À COMPLÉTER
            { heure: "18:30", titre: "Accueil & maquillage", texte: "Rendez-vous sur la place, stand maquillage pour les enfants." },
            { heure: "19:00", titre: "Départ des chasses aux citrouilles", texte: "Parcours petits, grands et adultes." },
            { heure: "20:00", titre: "Défilé costumé", texte: "Dans les rues du village." },
            { heure: "20:30", titre: "Soupe & remise des bonbons", texte: "Pour tous les chasseurs qui ont trouvé la phrase secrète." }
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
        email: "halloween.couternon@example.fr"   // À COMPLÉTER
    },

    /* Lieux fixes ajoutés à la « Carte du village » (en plus du lieu de la soirée et de data/lieux.json).
       Types : maison, hante, evenement — ex. { type: "evenement", nom: "Atelier citrouilles", coords: [47.33, 5.15] } */
    lieux: [],

    parcours: {
        petits: {
            nom: "Chasse des petits",
            public: "Enfants — jusqu'à 7 ans",   // À COMPLÉTER
            description: "Un petit parcours pour trouver une phrase courte.",
            // 8 points maximum
            ouverture: "2026-10-31T17:00:00",   // À COMPLÉTER
            couleur: "orange",
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
            public: "Enfants — 8 ans et plus",    // À COMPLÉTER
            description: "11 citrouilles cachent chacune une syllabe. Retrouve-les toutes, puis le point secret !",
            ouverture: "2026-10-31T17:00:00",    // À COMPLÉTER
            couleur: "violet",
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
            public: "Nouveauté 2026 — pour les parents",
            description: "Un parcours plus long et plus corsé, réservé aux grands enfants… de plus de 18 ans.",
            ouverture: "2026-10-31T17:00:00",    // À COMPLÉTER
            couleur: "violet",
            // À COMPLÉTER : parcours adulte provisoire (reprend 8 points du grand parcours)
            points: {
                "1": { coords: [47.334267, 5.154304], lettre: "S" },
                "2": { coords: [47.334399, 5.149966], lettre: "O" },
                "3": { coords: [47.334338, 5.149016], lettre: "R" },
                "4": { coords: [47.333882, 5.148400], lettre: "C" },
                "5": { coords: [47.332713, 5.148748], lettre: "I" },
                "6": { coords: [47.334905, 5.148384], lettre: "E" },
                "7": { coords: [47.335400, 5.150589], lettre: "R" },
                "8": { coords: [47.337738, 5.147247], lettre: "E" }
            },
            secret: { coords: [47.3366272, 5.1588904], lettre: "🦇" },
            phrase: ["1", "2", "3", "4", "5", "6", "7", "8", " ", "secret"]
        }
    }
};
