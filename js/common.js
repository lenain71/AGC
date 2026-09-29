/*
 * Hallo' Village — fonctions communes à toutes les pages
 * (menu, barre d'onglets, progression, dates, illustrations)
 */
(function () {
    const C = AGC.config;
    const params = new URLSearchParams(location.search);

    AGC.debug = params.get("debug") === "1";

    /* ---------- Progression (localStorage, une clé par année et par parcours) ---------- */
    function key(id) { return "agc" + C.annee + ":" + id; }

    AGC.charger = function (id) {
        try {
            const brut = localStorage.getItem(key(id));
            if (brut) return Object.assign({ visites: {}, secret: false, finalVu: false }, JSON.parse(brut));
        } catch (e) { /* stockage indisponible : on repart de zéro */ }
        return { visites: {}, secret: false, finalVu: false };
    };

    AGC.sauver = function (id, etat) {
        try { localStorage.setItem(key(id), JSON.stringify(etat)); } catch (e) { /* ignoré */ }
    };

    AGC.effacer = function (id) {
        try { localStorage.removeItem(key(id)); } catch (e) { /* ignoré */ }
    };

    AGC.progression = function (id) {
        const p = C.parcours[id];
        const etat = AGC.charger(id);
        const total = Object.keys(p.points).length + (p.secret ? 1 : 0);
        const trouves = Object.keys(p.points).filter(n => etat.visites[n]).length + (p.secret && etat.secret ? 1 : 0);
        return { trouves, total, fini: trouves === total };
    };

    /* ---------- Dates ---------- */
    /* L'heure de référence est celle du serveur (en-tête Date), pour qu'avancer l'horloge du téléphone ne serve à rien */
    AGC.decalage = 0;
    AGC.maintenant = () => Date.now() + AGC.decalage;
    AGC.heureSync = fetch(location.href, { method: "HEAD", cache: "no-store" })
        .then(r => {
            const d = Date.parse(r.headers.get("Date"));
            if (d) AGC.decalage = d - Date.now();
        })
        .catch(() => { /* hors ligne : heure du téléphone */ });

    AGC.estTermine = function (id) {
        const f = C.parcours[id].fermeture;
        return !AGC.debug && !!f && AGC.maintenant() >= new Date(f).getTime();
    };
    AGC.estOuvert = function (id) {
        return AGC.debug || (AGC.maintenant() >= new Date(C.parcours[id].ouverture).getTime() && !AGC.estTermine(id));
    };

    AGC.compteARebours = function (iso) {
        let s = Math.max(0, Math.floor((new Date(iso).getTime() - AGC.maintenant()) / 1000));
        const j = Math.floor(s / 86400); s %= 86400;
        const h = Math.floor(s / 3600); s %= 3600;
        const m = Math.floor(s / 60); s %= 60;
        return { j, h, m, s, fini: j + h + m + s === 0 };
    };

    AGC.texteRebours = function (iso) {
        const r = AGC.compteARebours(iso);
        if (r.j > 0) return r.j + " j " + r.h + " h " + String(r.m).padStart(2, "0") + " min";
        return r.h + " h " + String(r.m).padStart(2, "0") + " min " + String(r.s).padStart(2, "0") + " s";
    };

    const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    AGC.dateLongue = function (iso) {
        const d = new Date(iso);
        return JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear();
    };
    AGC.heure = function (iso) {
        const d = new Date(iso);
        return d.getHours() + "h" + String(d.getMinutes()).padStart(2, "0");
    };

    /* ---------- Illustrations ---------- */
    AGC.citrouille = function (taille, extra) {
        return '<svg class="citrouille ' + (extra || "") + '" width="' + taille + '" height="' + taille + '" viewBox="0 0 64 64" aria-hidden="true">' +
            '<path d="M32 14c1-5 4-8 8-9l2 3c-3 1-5 3-6 6z" fill="#4a7a2a"/>' +
            '<ellipse cx="20" cy="37" rx="15" ry="20" fill="#e86a00"/>' +
            '<ellipse cx="44" cy="37" rx="15" ry="20" fill="#e86a00"/>' +
            '<ellipse cx="32" cy="37" rx="15" ry="21" fill="#ff8a00"/>' +
            '<path d="M18 31l7-6 3 8zM46 31l-7-6-3 8z" fill="#2a1100"/>' +
            '<path d="M29 37l3-4 3 4z" fill="#2a1100"/>' +
            '<path d="M16 42q16 12 32 0l-3 6-3-3-3 4-3-4-3 4-3-4-3 4-3-3-3 3z" fill="#2a1100"/>' +
            '</svg>';
    };

    /* Village de nuit : ciel, lune, chauves-souris, maisons éclairées, citrouilles */
    AGC.village = function () {
        const maisons = [
            [10, 150, 46, 40], [52, 140, 40, 50], [96, 156, 36, 34], [232, 146, 44, 44],
            [280, 136, 38, 54], [322, 152, 40, 38], [366, 144, 40, 46]
        ];
        let bati = "", fenetres = "";
        maisons.forEach(([x, y, w, h]) => {
            bati += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (210 - y) + '"/>' +
                '<path d="M' + (x - 4) + " " + y + "L" + (x + w / 2) + " " + (y - h * 0.55) + "L" + (x + w + 4) + " " + y + 'z"/>';
            for (let fx = x + 7; fx < x + w - 8; fx += 14) {
                for (let fy = y + 8; fy < 196; fy += 16) {
                    if ((fx * 7 + fy * 3) % 5 < 3) fenetres += '<rect x="' + fx + '" y="' + fy + '" width="7" height="9" rx="1"/>';
                }
            }
        });
        let etoiles = "";
        for (let i = 0; i < 40; i++) {
            etoiles += '<circle cx="' + ((i * 97) % 400) + '" cy="' + ((i * 53) % 110) + '" r="' + (i % 3 === 0 ? 1.2 : 0.7) + '"/>';
        }
        const chauveSouris = (x, y, s) => '<path transform="translate(' + x + " " + y + ") scale(" + s + ')" d="M0 0q6-6 12-2q4-5 6 0q2-5 6 0q6-4 12 2q-6-1-9 3q-3-3-6 0q-3-3-6 0q-3-4-9-3z"/>';
        let citrouilles = "";
        [[40, 200], [150, 204], [205, 198], [300, 203], [385, 200]].forEach(([x, y], i) => {
            const r = 7 + (i % 2) * 2;
            citrouilles += '<g transform="translate(' + x + " " + y + ')"><ellipse rx="' + (r + 2) + '" ry="' + r + '" fill="#ff8a00"/>' +
                '<path d="M-4-2l2-2 1 3zM4-2l-2-2-1 3zM-4 2q4 3 8 0" fill="#2a1100"/></g>';
        });
        return '<svg class="village" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
            '<defs>' +
            '<linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0a24"/><stop offset=".6" stop-color="#2a1a55"/><stop offset="1" stop-color="#6b2f4a"/></linearGradient>' +
            '<radialGradient id="halo"><stop offset="0" stop-color="#ffcf6b" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/></radialGradient>' +
            '<filter id="lueur"><feGaussianBlur stdDeviation="1.6"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '</defs>' +
            '<rect width="400" height="220" fill="url(#ciel)"/>' +
            '<g fill="#fff" opacity=".7">' + etoiles + '</g>' +
            '<circle cx="330" cy="52" r="60" fill="url(#halo)"/>' +
            '<circle cx="330" cy="52" r="26" fill="#ffd27a"/>' +
            '<circle cx="321" cy="46" r="4" fill="#e9b75c" opacity=".6"/><circle cx="338" cy="60" r="6" fill="#e9b75c" opacity=".5"/>' +
            '<g fill="#07061a">' + chauveSouris(270, 40, .9) + chauveSouris(300, 78, .6) + chauveSouris(60, 50, .7) + '</g>' +
            '<path d="M0 170q60-30 130-10t140-6 130 0v66H0z" fill="#1b1238"/>' +
            '<g fill="#0d0a1f">' + bati +
            '<rect x="160" y="110" width="50" height="100"/><path d="M156 110l29-22 29 22z"/>' +
            '<rect x="176" y="60" width="18" height="50"/><path d="M172 62l13-34 13 34z"/>' +
            '</g>' +
            '<g fill="#ffb347" filter="url(#lueur)">' + fenetres +
            '<rect x="180" y="72" width="10" height="14" rx="5"/><rect x="175" y="130" width="20" height="26" rx="10"/></g>' +
            '<rect y="205" width="400" height="15" fill="#08061a"/>' +
            '<g filter="url(#lueur)">' + citrouilles + '</g>' +
            '</svg>';
    };

    /* ---------- Coque de l'application : barre du haut, menu, onglets ---------- */
    const LIENS = [
        { href: "accueil.html", icone: "fa-house", texte: "Accueil" },
        { href: "soiree.html", icone: "fa-calendar-days", texte: "La soirée" },
        { href: "enfants.html", icone: "fa-candy-cane", texte: "Chasse des enfants" },
        { href: "jeu.html?p=adultes", icone: "fa-user-group", texte: "Chasse des adultes" },
        { href: "carte.html", icone: "fa-map", texte: "Carte du village" },
        { href: "profil.html", icone: "fa-user", texte: "Ma progression" }
    ];
    const ONGLETS = [
        { href: "accueil.html", icone: "fa-house", texte: "Accueil" },
        { href: "carte.html", icone: "fa-map", texte: "Carte" },
        { href: "soiree.html", icone: "fa-calendar-days", texte: "Soirée" },
        { href: "profil.html", icone: "fa-user", texte: "Profil" }
    ];

    function suffixe() { return AGC.debug ? (/\?/.test(this) ? "&debug=1" : "?debug=1") : ""; }
    AGC.lien = function (href) { return href + suffixe.call(href); };

    /* options : { titre, retour, page } — titre absent = logo Hallo' Village */
    AGC.coque = function (options) {
        const o = options || {};
        const entete = document.createElement("header");
        entete.className = "barre";
        entete.innerHTML =
            (o.retour
                ? '<a class="barre-btn" href="' + AGC.lien(o.retour) + '" aria-label="Retour"><i class="fa-solid fa-chevron-left"></i></a>'
                : '<button class="barre-btn" id="ouvrir-menu" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>') +
            (o.titre
                ? '<h1 class="barre-titre">' + o.titre + "</h1>"
                : '<a class="logo" href="' + AGC.lien("accueil.html") + '">' + AGC.citrouille(34) + "<span>Hallo'<br>Village</span></a>") +
            (o.retour
                ? '<button class="barre-btn" id="ouvrir-menu" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>'
                : '<span class="barre-btn" aria-hidden="true"></span>');
        document.body.prepend(entete);

        const menu = document.createElement("div");
        menu.className = "menu";
        menu.hidden = true;
        menu.innerHTML =
            '<nav class="menu-panneau" aria-label="Menu principal">' +
            '<div class="menu-tete">' + AGC.citrouille(40) + "<span>Hallo' Village</span>" +
            '<button class="barre-btn" id="fermer-menu" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button></div>' +
            LIENS.map(l => '<a href="' + AGC.lien(l.href) + '"' + (l.href.split("?")[0] === o.page && (!o.parcours || l.href.includes(o.parcours)) ? ' class="actif"' : "") +
                '><i class="fa-solid ' + l.icone + '"></i>' + l.texte + "</a>").join("") +
            '<p class="menu-pied">Halloween ' + C.annee + " · " + C.village + "</p>" +
            "</nav>";
        document.body.appendChild(menu);
        const basculer = ouvert => { menu.hidden = !ouvert; };
        document.getElementById("ouvrir-menu").onclick = () => basculer(true);
        document.getElementById("fermer-menu").onclick = () => basculer(false);
        menu.addEventListener("click", e => { if (e.target === menu) basculer(false); });

        if (!o.sansOnglets) {
            const onglets = document.createElement("nav");
            onglets.className = "onglets";
            onglets.setAttribute("aria-label", "Navigation");
            onglets.innerHTML = ONGLETS.map(l =>
                '<a href="' + AGC.lien(l.href) + '"' + (l.href === o.page ? ' class="actif" aria-current="page"' : "") +
                '><i class="fa-solid ' + l.icone + '"></i><span>' + l.texte + "</span></a>").join("");
            document.body.appendChild(onglets);
        }
    };

    /* Libellé d'état d'un parcours (pour les tuiles, la page enfants et le profil) */
    AGC.etatParcours = function (id) {
        const p = C.parcours[id];
        if (AGC.estTermine(id)) return { classe: "ferme", texte: '<i class="fa-solid fa-moon"></i> Terminé pour cette année' };
        if (!AGC.estOuvert(id)) return { classe: "ferme", texte: '<i class="fa-solid fa-lock"></i> Ouverture dans <b data-rebours="' + p.ouverture + '">' + AGC.texteRebours(p.ouverture) + "</b>" };
        const pr = AGC.progression(id);
        if (pr.fini) return { classe: "fini", texte: '<i class="fa-solid fa-trophy"></i> Terminé !' };
        if (pr.trouves > 0) return { classe: "encours", texte: '<i class="fa-solid fa-play"></i> Continuer · ' + pr.trouves + "/" + pr.total };
        return { classe: "ouvert", texte: '<i class="fa-solid fa-play"></i> Commencer' };
    };

    /* Met à jour chaque seconde tous les éléments [data-rebours] */
    AGC.animerRebours = function () {
        setInterval(() => {
            document.querySelectorAll("[data-rebours]").forEach(el => {
                el.textContent = AGC.texteRebours(el.dataset.rebours);
            });
        }, 1000);
    };
})();
