/*
 * Hallo' Village — moteur de la chasse aux citrouilles
 * Le parcours est choisi par l'URL : jeu.html?p=petits | grands | adultes  (+ &debug=1)
 *
 * Mode debug : pas de blocage horaire, un toucher sur la carte simule la position,
 * panneau avec distances et boutons « tout trouver » / « réinitialiser ».
 */
(function () {
    const C = AGC.config;
    const id = new URLSearchParams(location.search).get("p");
    const P = C.parcours[id];
    if (!P) { location.replace(AGC.lien("accueil.html")); return; }

    document.title = P.nom + " — Hallo' Village";
    AGC.coque({
        page: "jeu.html", parcours: id, titre: P.nom, sansOnglets: true,
        retour: id === "adultes" ? "accueil.html" : "enfants.html"
    });

    let etat = AGC.charger(id);
    let jeuOuvert = false;
    const idsPoints = Object.keys(P.points);

    /* ---------- Phrase : jetons dans l'ordre d'affichage ---------- */
    const jetons = P.phrase.map(t =>
        t === "secret" ? { type: "secret" } :
        P.points[t] ? { type: "point", id: t } :
        { type: "texte", valeur: t });

    function jetonTrouve(j) {
        return j.type === "texte" || (j.type === "secret" ? etat.secret : !!etat.visites[j.id]);
    }
    function jetonValeur(j) {
        return j.type === "texte" ? j.valeur : j.type === "secret" ? P.secret.lettre : P.points[j.id].lettre;
    }
    function phraseComplete() {
        return jetons.map(jetonValeur).join("").replace(/\s+/g, " ").trim();
    }

    if (AGC.debug) {
        const usages = {};
        P.phrase.forEach(t => { if (P.points[t]) usages[t] = (usages[t] || 0) + 1; });
        idsPoints.forEach(n => {
            if (!usages[n]) console.warn("[Hallo' Village] point " + n + " (" + P.points[n].lettre + ") absent de la phrase");
            else if (usages[n] > 1) console.warn("[Hallo' Village] point " + n + " utilisé " + usages[n] + " fois dans la phrase");
        });
        console.info("[Hallo' Village] phrase " + id + " : « " + phraseComplete() + " »");
    }

    const pointsTrouves = () => idsPoints.filter(n => etat.visites[n]).length;
    const tousPointsTrouves = () => pointsTrouves() === idsPoints.length;
    const fini = () => tousPointsTrouves() && (!P.secret || etat.secret);

    function afficherPhrase() {
        const mots = [[]];
        jetons.forEach(j => {
            if (j.type === "texte" && !j.valeur.trim()) { mots.push([]); return; }
            mots[mots.length - 1].push(j);
        });
        document.getElementById("mots").innerHTML = mots.filter(m => m.length).map(m =>
            '<span class="mot">' + m.map(j => jetonTrouve(j)
                ? '<span class="case trouvee">' + jetonValeur(j) + "</span>"
                : '<span class="case">?</span>').join("") + "</span>").join("");
        const total = idsPoints.length + (P.secret ? 1 : 0);
        const trouves = pointsTrouves() + (P.secret && etat.secret ? 1 : 0);
        document.getElementById("compteur").textContent = trouves + " / " + total;
    }

    /* ---------- Fenêtres (file d'attente : une seule à la fois) ---------- */
    const file = [];
    let fenetreOuverte = false;

    function fenetre(html, boutons) {
        return new Promise(resolve => {
            file.push({ html, boutons, resolve });
            if (!fenetreOuverte) suivante();
        });
    }
    function suivante() {
        const f = file.shift();
        if (!f) { fenetreOuverte = false; return; }
        fenetreOuverte = true;
        const el = document.createElement("div");
        el.className = "fenetre";
        el.setAttribute("role", "dialog");
        el.innerHTML = '<div class="fenetre-boite">' + f.html +
            f.boutons.map((b, i) => '<button class="bouton ' + (b.classe || "") + '" data-i="' + i + '">' + b.texte + "</button>").join("") +
            "</div>";
        el.addEventListener("click", e => {
            const b = e.target.closest("[data-i]");
            if (!b) return;
            el.remove();
            const choix = f.boutons[b.dataset.i];
            if (choix.action) choix.action();
            f.resolve(choix.valeur);
            suivante();
        });
        document.body.appendChild(el);
    }

    let toastEl = null, toastMinuteur = null;
    function toast(texte, classe, duree) {
        if (toastEl) toastEl.remove();
        clearTimeout(toastMinuteur);
        toastEl = document.createElement("div");
        toastEl.className = "toast " + (classe || "");
        toastEl.textContent = texte;
        document.body.appendChild(toastEl);
        toastMinuteur = setTimeout(() => { toastEl.remove(); toastEl = null; }, duree || 4000);
    }

    function vibrer(motif) { if ("vibrate" in navigator) navigator.vibrate(motif); }

    function confettis() {
        const couleurs = ["#ff8a00", "#6a4bff", "#ffd27a", "#b7a6ff", "#ffffff"];
        for (let i = 0; i < 90; i++) {
            const c = document.createElement("div");
            c.className = "confetti";
            c.style.left = Math.random() * 100 + "vw";
            c.style.background = couleurs[i % couleurs.length];
            c.style.animationDuration = (2.5 + Math.random() * 2.5) + "s";
            c.style.animationDelay = Math.random() * .8 + "s";
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 6000);
        }
    }

    /* ---------- Carte et marqueurs ---------- */
    const map = AGC.creerCarte("carte", P.points[idsPoints[0]].coords, 16);
    const marqueurs = {};
    let marqueurSecret = null;

    function iconePoint(n) {
        const html = etat.visites[n]
            ? '<div class="marqueur-trouve">' + P.points[n].lettre + '</div><span class="marqueur-num">' + n + "</span>"
            : AGC.citrouille(40, "marqueur-citrouille") + '<span class="marqueur-num">' + n + "</span>";
        return L.divIcon({ className: "marqueur", iconSize: [40, 40], iconAnchor: [20, 20], html });
    }
    idsPoints.forEach(n => {
        marqueurs[n] = L.marker(P.points[n].coords, { icon: iconePoint(n), keyboard: false }).addTo(map);
    });

    function afficherSecret() {
        if (!P.secret || marqueurSecret || !tousPointsTrouves()) return;
        marqueurSecret = L.marker(P.secret.coords, {
            zIndexOffset: 500,
            icon: L.divIcon({
                className: "marqueur", iconSize: [40, 40], iconAnchor: [20, 20],
                html: etat.secret ? '<div class="marqueur-trouve">' + P.secret.lettre + "</div>" : '<div class="marqueur-secret">👻</div>'
            })
        }).addTo(map);
    }

    function cadrerTout() {
        const coords = idsPoints.map(n => P.points[n].coords);
        if (marqueurSecret) coords.push(P.secret.coords);
        map.fitBounds(coords, { paddingTopLeft: [20, 170], paddingBottomRight: [20, 90], maxZoom: 18 });
    }

    /* ---------- Découvertes ---------- */
    function trouver(cible) {
        if (cible === "secret") etat.secret = true;
        else etat.visites[cible] = true;
        AGC.sauver(id, etat);
        vibrer([200, 100, 200]);

        if (cible === "secret") {
            map.removeLayer(marqueurSecret);
            marqueurSecret = null;
            afficherSecret();
        } else {
            marqueurs[cible].setIcon(iconePoint(cible));
        }
        afficherPhrase();

        const lettre = cible === "secret" ? P.secret.lettre : P.points[cible].lettre;
        fenetre(
            AGC.citrouille(56) +
            "<h2>" + (cible === "secret" ? "Le point secret !" : "Citrouille n°" + cible + " trouvée !") + "</h2>" +
            '<div class="lettre-geante">' + lettre + "</div>" +
            "<p>" + (fini() ? "C'était la dernière…" : "Ce morceau rejoint ta phrase secrète.") + "</p>",
            [{ texte: "Continuer" }]
        ).then(apresDecouverte);
    }

    function apresDecouverte() {
        if (P.secret && tousPointsTrouves() && !etat.secret && !marqueurSecret) {
            afficherSecret();
            fenetre(
                '<div class="lettre-geante">👻</div><h2>Un point secret est apparu !</h2>' +
                "<p>Toutes les citrouilles sont trouvées. Un fantôme se cache quelque part sur la carte : trouve-le pour compléter la phrase.</p>",
                [{ texte: "Voir où il est", action: () => map.flyTo(P.secret.coords, 17) }]
            );
        } else if (fini() && !etat.finalVu) {
            etat.finalVu = true;
            AGC.sauver(id, etat);
            fenetreFinale();
        }
    }

    function fenetreFinale() {
        confettis();
        vibrer([300, 100, 300, 100, 500]);
        fenetre(
            AGC.citrouille(64) + "<h2>Bravo, tu as trouvé la phrase secrète !</h2>" +
            '<div class="phrase-finale">' + phraseComplete() + "</div>" +
            "<p>Montre cet écran aux organisateurs de la soirée pour récupérer ta surprise 🍬</p>",
            [{ texte: "Fermer" }]
        );
    }

    document.getElementById("phrase").addEventListener("click", () => { if (fini()) fenetreFinale(); });

    /* ---------- Position ---------- */
    const refroidi = { chaud: false, precision: false };
    function attendre(cle, ms) { refroidi[cle] = true; setTimeout(() => { refroidi[cle] = false; }, ms); }

    function surPosition(latlng, precision) {
        const ici = latlng;

        const gps = document.getElementById("gps");
        gps.className = "gps " + (precision <= 10 ? "bon" : precision <= 25 ? "moyen" : "mauvais");
        document.getElementById("gps-texte").textContent = "GPS ± " + Math.round(precision) + " m";

        if (!jeuOuvert) return;

        // Seuils ajustés à la précision du GPS (réglages 2025)
        const proche = precision > 15 ? 15 : 8;
        const tresProche = precision > 15 ? 10 : 3;

        const cibles = idsPoints.filter(n => !etat.visites[n]).map(n => ({ cle: n, coords: P.points[n].coords }));
        if (marqueurSecret && !etat.secret) cibles.push({ cle: "secret", coords: P.secret.coords });
        cibles.forEach(c => { c.d = AGC.distance(ici, c.coords); });
        cibles.sort((a, b) => a.d - b.d);
        const plusProche = cibles[0];

        if (AGC.debug) {
            const dbg = document.getElementById("debug");
            dbg.hidden = false;
            dbg.innerHTML = "Lat " + ici[0].toFixed(6) + "<br>Lng " + ici[1].toFixed(6) + "<br>± " + precision.toFixed(1) + " m" +
                "<br>Seuils " + proche + " / " + tresProche + " m" +
                (plusProche ? "<br>Proche : " + plusProche.cle + " à " + plusProche.d.toFixed(1) + " m" : "") +
                '<br><button id="dbg-tout">Tout trouver</button> <button id="dbg-raz">Réinitialiser</button>';
        }

        if (precision > 25 && !refroidi.precision) {
            toast("GPS imprécis (± " + Math.round(precision) + " m) : reste à découvert quelques secondes.", "info", 4000);
            attendre("precision", 30000);
        }

        if (!plusProche || fenetreOuverte) return;
        if (plusProche.d <= tresProche) {
            trouver(plusProche.cle);
        } else if (plusProche.d <= proche && !refroidi.chaud) {
            vibrer(100);
            toast("Tu chauffes… 🔥", "", 3500);
            attendre("chaud", 6000);
        }
    }

    function surErreur(err) {
        const gps = document.getElementById("gps");
        gps.className = "gps mauvais";
        document.getElementById("gps-texte").textContent = "GPS indisponible";
        if (err.code === 1) {
            fenetre(
                '<div class="lettre-geante">📍</div><h2>Localisation refusée</h2>' +
                "<p>Le jeu a besoin de ta position pour savoir quand tu es près d'une citrouille. " +
                "Autorise la localisation pour ce site dans les réglages du navigateur, puis recharge la page.</p>",
                [{ texte: "Recharger", action: () => location.reload() }, { texte: "Fermer", classe: "discret" }]
            );
        }
    }

    const suivi = AGC.suivrePosition(map, surPosition, surErreur,
        latlng => AGC.distance([latlng[0], latlng[1]], P.points[idsPoints[0]].coords) < 2000);

    document.getElementById("recentrer").onclick = () => {
        const pos = suivi.position();
        if (pos) map.setView(pos, 18);
        else toast("Position pas encore trouvée…", "info", 2500);
    };
    document.getElementById("voir-tout").onclick = cadrerTout;

    if (AGC.debug) {
        map.on("click", e => suivi.simuler([e.latlng.lat, e.latlng.lng]));
        document.getElementById("debug").addEventListener("click", e => {
            if (e.target.id === "dbg-tout") {
                idsPoints.forEach(n => { etat.visites[n] = true; });
                AGC.sauver(id, etat);
                location.reload();
            } else if (e.target.id === "dbg-raz") {
                AGC.effacer(id);
                location.reload();
            }
        });
    }

    /* ---------- Démarrage ---------- */
    afficherSecret();
    afficherPhrase();
    cadrerTout();

    if (!AGC.estOuvert(id)) {
        fenetre(
            AGC.citrouille(64) + "<h2>Patience, petit monstre…</h2>" +
            "<p>La chasse ouvre le " + AGC.dateLongue(P.ouverture) + " à " + AGC.heure(P.ouverture) + ".<br>" +
            'Encore <b data-rebours="' + P.ouverture + '">' + AGC.texteRebours(P.ouverture) + "</b></p>",
            [{ texte: "Retour", action: () => history.length > 1 ? history.back() : location.assign(AGC.lien("accueil.html")) }]
        );
        AGC.animerRebours();
        setInterval(() => { if (AGC.estOuvert(id)) location.reload(); }, 5000);
    } else {
        jeuOuvert = true;
        if (!etat.introVue) {
            fenetre(
                AGC.citrouille(64) + "<h2>" + P.nom + "</h2>" +
                '<ul class="regles">' +
                '<li><i class="fa-solid fa-map-location-dot"></i><span>' + idsPoints.length + " citrouilles sont cachées sur la carte" +
                (P.secret ? ", plus un point secret qui apparaît à la fin" : "") + ".</span></li>" +
                '<li><i class="fa-solid fa-fire"></i><span>En t\'approchant, ton téléphone vibre : tu chauffes !</span></li>' +
                '<li><i class="fa-solid fa-font"></i><span>Tout près, un morceau de la phrase secrète apparaît.</span></li>' +
                '<li><i class="fa-solid fa-person-walking"></i><span>Reste sur les trottoirs et regarde autour de toi, pas seulement l\'écran 😉</span></li>' +
                "</ul>",
                [{ texte: "C'est parti !", action: () => { etat.introVue = true; AGC.sauver(id, etat); } }]
            );
        }
        if (fini() && !etat.finalVu) apresDecouverte();
    }
})();
