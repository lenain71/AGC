/*
 * Hallo' Village — moteur de la chasse aux citrouilles
 * Le parcours est choisi par l'URL : jeu.html?p=petits | grands | adultes  (+ &debug=1)
 *
 * Mode nuit (parcours avec un bloc « nuit », ex. adultes) : ambiance sonore, sons de proximité,
 * flash Android, et les dernières cibles disparaissent de la carte (on les trouve au son).
 *
 * Mode debug : pas de blocage horaire, un toucher sur la carte simule la position,
 * panneau avec distances et boutons « tout trouver » / « réinitialiser » / sons.
 */
(async function () {
    const C = AGC.config;
    const id = new URLSearchParams(location.search).get("p");
    const P = C.parcours[id];
    if (!P) { location.replace(AGC.lien("accueil.html")); return; }
    await AGC.parcoursPret;   // points, secret et phrase éventuellement remplacés par data/parcours.json
    const N = P.nuit || null;

    document.title = P.nom + " — Hallo' Village";
    if (N) document.body.classList.add("nuit");
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
    const secretActif = () => !!P.secret && tousPointsTrouves();
    const restantes = () => idsPoints.length - pointsTrouves() + (P.secret && !etat.secret ? 1 : 0);
    /* Mode nuit : quand il ne reste que N.audioSeul cibles, elles ne sont plus affichées */
    const modeAudio = () => !!N && !fini() && restantes() <= N.audioSeul;

    /* Cibles cachées du mode audio, avec leur énigme */
    function ciblesCachees() {
        if (!modeAudio()) return [];
        const liste = idsPoints.filter(n => !etat.visites[n])
            .map(n => ({ cle: n, coords: P.points[n].coords, enigme: P.points[n].enigme, nom: "Citrouille n°" + n }));
        if (secretActif() && !etat.secret) liste.push({ cle: "secret", coords: P.secret.coords, enigme: P.secret.enigme, nom: "L'esprit" });
        return liste;
    }

    /* Centre de la « zone maudite » : décalé de la cible, toujours de la même façon pour une cible donnée */
    function centreZone(cle, coords) {
        let h = 2166136261;
        for (const c of id + ":" + cle) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
        h >>>= 0;
        const angle = (h % 360) * Math.PI / 180;
        const dist = N.zone * .65 * Math.sqrt(((h >>> 9) % 1000) / 1000);
        return [
            coords[0] + dist * Math.cos(angle) / 111320,
            coords[1] + dist * Math.sin(angle) / (111320 * Math.cos(coords[0] * Math.PI / 180))
        ];
    }

    function texteEnigmes(liste) {
        return '<ul class="regles enigmes">' + liste.map(c =>
            '<li><i class="fa-solid fa-scroll"></i><span><b>' + c.nom + "</b><br>" + AGC.echap(c.enigme || "Aucun indice… écoute.") + "</span></li>").join("") + "</ul>";
    }

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
        document.getElementById("compteur").textContent = (total - restantes()) + " / " + total;
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
            const choix = f.boutons[b.dataset.i];
            if (choix.action) choix.action(el);   // avant la fermeture : l'action peut lire le contenu de la fenêtre
            el.remove();
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

    /* Sons courts des parcours enfants (P.sons). Le navigateur n'autorise le son qu'après un geste :
       il est débloqué au premier toucher de l'écran (bouton, carte…). */
    const Son = (() => {
        let ctx = null;
        const tampons = {};
        const charger = nom => tampons[nom] || (tampons[nom] = fetch("sons/" + nom + ".mp3")
            .then(r => r.arrayBuffer())
            .then(b => new Promise((ok, ko) => ctx.decodeAudioData(b, ok, ko))));
        return {
            debloquer() {
                if (!P.sons) return;
                if (!ctx) {
                    const Ctx = window.AudioContext || window.webkitAudioContext;
                    if (!Ctx) return;
                    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* non géré */ }
                    ctx = new Ctx();
                    [].concat(...Object.values(P.sons)).forEach(charger);
                }
                if (ctx.state !== "running") ctx.resume();
            },
            /* P.sons[cle] : un fichier, ou une liste dont on tire un élément au hasard */
            async jouer(cle) {
                if (!ctx || !P.sons || !P.sons[cle]) return;
                const liste = [].concat(P.sons[cle]);
                const src = ctx.createBufferSource();
                src.buffer = await charger(liste[Math.floor(Math.random() * liste.length)]);
                src.connect(ctx.destination);
                src.start();
            }
        };
    })();
    if (!N) document.addEventListener("pointerdown", () => Son.debloquer(), { passive: true });

    function confettis() {
        const couleurs = N ? ["#b3121b", "#6a4bff", "#ffd27a", "#3b0a0e", "#ffffff"] : ["#ff8a00", "#6a4bff", "#ffd27a", "#b7a6ff", "#ffffff"];
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

    /* Garde l'écran allumé pendant la partie (sinon GPS et sons s'arrêtent au verrouillage) */
    let verrouEcran = null;
    async function garderEcran() {
        try { if ("wakeLock" in navigator && !verrouEcran) verrouEcran = await navigator.wakeLock.request("screen"); } catch (e) { /* refusé */ }
        if (verrouEcran) verrouEcran.addEventListener("release", () => { verrouEcran = null; });
    }
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && jeuOuvert) garderEcran();
    });

    /* ---------- Carte et marqueurs ---------- */
    /* Fond de carte : plan nuit ou satellite réel. Le joueur peut basculer (sauf en mode nuit) ; son choix est mémorisé. */
    const CLE_FOND = "agc:fond";
    let fondChoisi = null;
    try { fondChoisi = localStorage.getItem(CLE_FOND); } catch (e) { /* stockage indisponible */ }
    const fondInitial = N ? "plan" : (fondChoisi || P.fond || "plan");
    const map = AGC.creerCarte("carte", P.points[idsPoints[0]].coords, 16, fondInitial);
    if (!N) {
        const bouton = document.getElementById("fond");
        const majBouton = () => {
            const sat = map._nomFond === "satellite";
            bouton.innerHTML = '<i class="fa-solid ' + (sat ? "fa-map" : "fa-satellite") + '"></i>';
            bouton.setAttribute("aria-label", sat ? "Passer au plan" : "Passer à la vue satellite");
        };
        bouton.hidden = false;
        majBouton();
        bouton.onclick = () => {
            const suivant = map._nomFond === "satellite" ? "plan" : "satellite";
            AGC.changerFond(map, suivant);
            try { localStorage.setItem(CLE_FOND, suivant); } catch (e) { /* ignoré */ }
            majBouton();
            toast(suivant === "satellite" ? "Vue satellite 🛰️" : "Plan de nuit 🌙", "info", 1500);
        };
    }
    const marqueurs = {};
    let marqueurSecret = null;
    const coucheZones = L.layerGroup().addTo(map);

    function iconePoint(n) {
        const html = etat.visites[n]
            ? '<div class="marqueur-trouve">' + P.points[n].lettre + '</div><span class="marqueur-num">' + n + "</span>"
            : AGC.citrouille(40, "marqueur-citrouille") + '<span class="marqueur-num">' + n + "</span>";
        return L.divIcon({ className: "marqueur", iconSize: [40, 40], iconAnchor: [20, 20], html });
    }
    idsPoints.forEach(n => {
        marqueurs[n] = L.marker(P.points[n].coords, { icon: iconePoint(n), keyboard: false });
    });

    /* Ajoute / retire les marqueurs selon l'avancement (point secret, cibles masquées du mode audio) */
    function majMarqueurs() {
        const cache = modeAudio();
        idsPoints.forEach(n => {
            const visible = etat.visites[n] || !cache;
            if (visible && !map.hasLayer(marqueurs[n])) marqueurs[n].addTo(map);
            if (!visible && map.hasLayer(marqueurs[n])) map.removeLayer(marqueurs[n]);
        });
        if (marqueurSecret) { map.removeLayer(marqueurSecret); marqueurSecret = null; }
        if (secretActif() && (etat.secret || !cache)) {
            marqueurSecret = L.marker(P.secret.coords, {
                zIndexOffset: 500,
                icon: L.divIcon({
                    className: "marqueur", iconSize: [40, 40], iconAnchor: [20, 20],
                    html: etat.secret ? '<div class="marqueur-trouve">' + P.secret.lettre + "</div>" : '<div class="marqueur-secret">👻</div>'
                })
            }).addTo(map);
        }

        // zones maudites + outils de la finale (radar, énigmes)
        coucheZones.clearLayers();
        const cachees = ciblesCachees();
        cachees.forEach(c => {
            L.circle(centreZone(c.cle, c.coords), {
                radius: N.zone, color: "#e0262e", weight: 2, dashArray: "6 8",
                fillColor: "#e0262e", fillOpacity: .12, interactive: true
            }).bindTooltip("Zone maudite — " + c.nom, { direction: "center", className: "info-zone" }).addTo(coucheZones);
        });
        if (N) {
            AGC.Nuit.finale(cachees.length > 0);   // sons aléatoires plus fréquents pendant la finale
            document.getElementById("sonar").hidden = !cachees.length;
            document.getElementById("enigmes").hidden = !cachees.length;
            const reste = N.sonar.cris - (etat.sonar || 0);
            document.getElementById("sonar-reste").textContent = Math.max(0, reste);
            document.getElementById("sonar").disabled = reste <= 0;
        }
    }

    function cadrerTout() {
        const coords = idsPoints.filter(n => map.hasLayer(marqueurs[n])).map(n => P.points[n].coords);
        if (marqueurSecret) coords.push(P.secret.coords);
        ciblesCachees().forEach(c => coords.push(centreZone(c.cle, c.coords)));
        if (!coords.length) idsPoints.forEach(n => coords.push(P.points[n].coords));
        map.fitBounds(coords, { paddingTopLeft: [20, 170], paddingBottomRight: [20, 90], maxZoom: 18 });
    }

    /* ---------- Découvertes ---------- */
    function trouver(cible) {
        if (cible === "secret") etat.secret = true;
        else etat.visites[cible] = true;
        AGC.sauver(id, etat);
        vibrer([200, 100, 200]);
        if (N) { AGC.Nuit.trouve(); AGC.Nuit.proximite(0); AGC.Nuit.proximiteFlash(0); }
        else Son.jouer("trouve");

        if (cible !== "secret") marqueurs[cible].setIcon(iconePoint(cible));
        majMarqueurs();
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
        if (N && modeAudio() && !etat.audioAnnonce) {
            etat.audioAnnonce = true;
            AGC.sauver(id, etat);
            fenetre(
                '<div class="lettre-geante">👂</div><h2>Elles se sont évanouies…</h2>' +
                "<p>Les " + restantes() + " dernières cibles ont disparu de la carte. Il ne reste que des <b>zones maudites</b> : " +
                "la citrouille s'y cache, mais pas forcément en son centre. Tends l'oreille, les murmures et les battements de cœur s'intensifient à son approche.</p>" +
                texteEnigmes(ciblesCachees()) +
                "<p>🦇 Tu disposes de <b>" + N.sonar.cris + " cris de chauve-souris</b> : plus l'écho revient vite et fort, plus tu es proche.</p>",
                [{ texte: "J'écoute…" }]
            );
        }
        if (secretActif() && !etat.secret && !etat.secretAnnonce) {
            etat.secretAnnonce = true;
            AGC.sauver(id, etat);
            fenetre(modeAudio()
                ? '<div class="lettre-geante">👻</div><h2>Un dernier esprit rôde…</h2>' +
                  "<p>Toutes les citrouilles sont trouvées. Un esprit se cache dans une nouvelle zone maudite : suis sa voix.</p>" +
                  texteEnigmes(ciblesCachees().filter(c => c.cle === "secret"))
                : '<div class="lettre-geante">👻</div><h2>Un point secret est apparu !</h2>' +
                  "<p>Toutes les citrouilles sont trouvées. Un fantôme se cache quelque part sur la carte : trouve-le pour compléter la phrase.</p>",
                modeAudio()
                    ? [{ texte: "J'écoute…" }]
                    : [{ texte: "Voir où il est", action: () => map.flyTo(P.secret.coords, 17) }]
            );
        } else if (fini() && !etat.finalVu) {
            etat.finalVu = true;
            AGC.sauver(id, etat);
            fenetreFinale();
        }
    }

    function fenetreFinale() {
        confettis();
        if (!N) Son.jouer("final");
        vibrer([300, 100, 300, 100, 500]);
        fenetre(
            AGC.citrouille(64) + "<h2>Bravo, tu as trouvé la phrase secrète !</h2>" +
            '<div class="phrase-finale">' + phraseComplete() + "</div>" +
            "<p>" + (P.messageFinal || "Montre cet écran aux organisateurs de la soirée pour récupérer ta surprise 🍬") + "</p>",
            [{ texte: "Fermer" }]
        );
    }

    document.getElementById("phrase").addEventListener("click", () => { if (fini()) fenetreFinale(); });

    /* ---------- Position ---------- */
    const refroidi = { chaud: false, precision: false };
    function attendre(cle, ms) { refroidi[cle] = true; setTimeout(() => { refroidi[cle] = false; }, ms); }
    const borne = x => Math.max(0, Math.min(1, x));

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
        if (secretActif() && !etat.secret) cibles.push({ cle: "secret", coords: P.secret.coords });
        cibles.forEach(c => { c.d = AGC.distance(ici, c.coords); });
        cibles.sort((a, b) => a.d - b.d);
        const plusProche = cibles[0];

        let son = 0, lumiere = 0;
        if (N && plusProche) {
            son = borne(1 - plusProche.d / (modeAudio() ? N.rayonSonAudio || N.rayonSon : N.rayonSon));
            lumiere = borne(1 - plusProche.d / N.rayonFlash);
            AGC.Nuit.proximite(son);
            AGC.Nuit.proximiteFlash(lumiere);
        }

        if (AGC.debug) {
            const dbg = document.getElementById("debug");
            dbg.hidden = false;
            dbg.innerHTML = "Lat " + ici[0].toFixed(6) + "<br>Lng " + ici[1].toFixed(6) + "<br>± " + precision.toFixed(1) + " m" +
                "<br>Seuils " + proche + " / " + tresProche + " m" +
                (plusProche ? "<br>Proche : " + plusProche.cle + " à " + plusProche.d.toFixed(1) + " m" : "") +
                (N ? "<br>Son " + Math.round(son * 100) + "% · flash " + Math.round(lumiere * 100) + "%" + (modeAudio() ? " · AUDIO" : "") : "") +
                '<br><button id="dbg-tout">Tout trouver</button> <button id="dbg-raz">Réinitialiser</button>' +
                (N ? '<br><button id="dbg-etrange">Son étrange</button> <button id="dbg-cri">Cri</button> <button id="dbg-sons">Tous les sons</button>' : "");
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
            toast(N ? "Quelque chose rôde tout près…" : "Tu chauffes… 🔥", "", 3500);
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

    /* ---------- Finale du mode nuit : radar « cri de chauve-souris » et énigmes ---------- */
    if (N) {
        /* Cône de direction du sonar : part du joueur vers la cible, longueur fixe (ne révèle pas la distance) */
        let cone = null, coneMinuteurs = [];
        function afficherCone(depart, arrivee, dureeS) {
            if (cone) map.removeLayer(cone);
            coneMinuteurs.forEach(clearTimeout);
            const rad = Math.PI / 180, kLat = 111320, kLng = 111320 * Math.cos(depart[0] * rad);
            const cap = Math.atan2((arrivee[1] - depart[1]) * kLng, (arrivee[0] - depart[0]) * kLat);   // 0 = nord
            // longueur minimale à l'écran (150 px) pour rester lisible quand la carte est dézoomée
            const metresParPx = map.distance(map.containerPointToLatLng([0, 0]), map.containerPointToLatLng([100, 0])) / 100;
            const ouverture = (N.sonar.angle || 40) * rad, longueur = Math.max(N.sonar.longueur || 120, 150 * metresParPx);
            const points = [depart];
            for (let k = 0; k <= 8; k++) {
                const a = cap - ouverture / 2 + ouverture * k / 8;
                points.push([depart[0] + longueur * Math.cos(a) / kLat, depart[1] + longueur * Math.sin(a) / kLng]);
            }
            cone = L.polygon(points, {
                className: "cone-sonar", interactive: false,
                color: "#ff3b3b", weight: 2, fillColor: "#e0262e", fillOpacity: .45
            }).addTo(map);
            if (!map.getBounds().contains(depart)) map.panTo(depart);
            const el = cone.getElement ? cone.getElement() : null;
            coneMinuteurs = [
                setTimeout(() => { if (el) el.classList.add("disparait"); }, dureeS * 1000 - 600),
                setTimeout(() => { if (cone) { map.removeLayer(cone); cone = null; } }, dureeS * 1000)
            ];
        }

        const boutonSonar = document.getElementById("sonar");
        boutonSonar.onclick = () => {
            const pos = suivi.position();
            const cachees = ciblesCachees();
            if (!pos || !cachees.length) return toast("Position pas encore trouvée…", "info", 2500);
            if ((etat.sonar || 0) >= N.sonar.cris) return;
            const ici = [pos.lat, pos.lng];
            const cible = cachees.map(c => ({ c, d: AGC.distance(ici, c.coords) })).sort((a, b) => a.d - b.d)[0];
            const d = cible.d;
            etat.sonar = (etat.sonar || 0) + 1;
            AGC.sauver(id, etat);
            majMarqueurs();
            boutonSonar.classList.remove("onde");
            void boutonSonar.offsetWidth;   // relance l'animation
            boutonSonar.classList.add("onde");
            const delai = AGC.Nuit.sonar(d, N.sonar.portee);
            afficherCone(ici, cible.c.coords, delai + (N.sonar.duree || 3));
            setTimeout(() => {
                const texte = d > 250 ? "Écho très lointain…" : d > 120 ? "Écho lointain…" : d > 50 ? "L'écho se rapproche…" : "L'écho claque : tout près !";
                const reste = N.sonar.cris - etat.sonar;
                toast(texte + (reste ? "" : " (plus aucun cri)"), "", 3500);
            }, delai * 1000);
        };
        document.getElementById("enigmes").onclick = () => {
            fenetre("<h2>Les énigmes</h2>" + texteEnigmes(ciblesCachees()), [{ texte: "Fermer" }]);
        };
    }

    if (AGC.debug) {
        map.on("click", e => suivi.simuler([e.latlng.lat, e.latlng.lng]));
        document.getElementById("debug").addEventListener("click", e => {
            const S = N && N.sons;
            if (e.target.id === "dbg-tout") {
                idsPoints.forEach(n => { etat.visites[n] = true; });
                AGC.sauver(id, etat);
                location.reload();
            } else if (e.target.id === "dbg-raz") {
                AGC.effacer(id);
                location.reload();
            } else if (e.target.id === "dbg-etrange") {
                AGC.Nuit.jouer(S.etranges[Math.floor(Math.random() * S.etranges.length)], .8, Math.random() * 1.8 - .9);
            } else if (e.target.id === "dbg-cri") {
                AGC.Nuit.jouer(S.cris[Math.floor(Math.random() * S.cris.length)], 1);
            } else if (e.target.id === "dbg-sons") {
                const tous = S.ambiance.map(a => a[0]).concat([S.murmures, S.coeur], S.etranges, S.cris, [S.trouve]);
                fenetre("<h2>Tous les sons</h2>" + tous.map(n =>
                    '<button type="button" class="bouton discret" data-son="' + n + '" style="margin-top:6px"><i class="fa-solid fa-play"></i> ' + n + "</button>").join(""),
                    [{ texte: "Fermer" }]);
            }
        });
        document.body.addEventListener("click", e => {
            const b = e.target.closest("[data-son]");
            if (b) AGC.Nuit.jouer(b.dataset.son, 1);
        });
    }

    /* ---------- Démarrage ---------- */
    majMarqueurs();
    afficherPhrase();
    cadrerTout();

    // heure du serveur (anti-triche), sans bloquer plus de 3 s
    await Promise.race([AGC.heureSync, new Promise(r => setTimeout(r, 3000))]);

    const retour = () => history.length > 1 ? history.back() : location.assign(AGC.lien("accueil.html"));

    // ex. « chaque soir de 21h00 à 1h00 » / « jusqu'au mercredi 4 novembre 2026 »
    const plageTexte = P.plage ? "chaque soir de " + AGC.hhmm(P.plage.debut) + " à " + AGC.hhmm(P.plage.fin) : "";
    const jusquau = AGC.dernierJour(id) ? "jusqu'au " + AGC.dateLongue(AGC.dernierJour(id)) : "";

    if (AGC.estTermine(id)) {
        fenetre(
            '<div class="lettre-geante">🌅</div><h2>La chasse est terminée</h2>' +
            "<p>Elle était ouverte " + jusquau + ". Merci à tous les chasseurs, et rendez-vous l'année prochaine…</p>",
            [{ texte: "Retour", action: retour }]
        );
    } else if (!AGC.estOuvert(id)) {
        const prochaine = AGC.prochaineOuverture(id);
        const dejaOuverte = AGC.maintenant() >= new Date(P.ouverture).getTime();
        const heureOuverture = AGC.heure(P.ouverture) === "0h00" ? "" : " à " + AGC.heure(P.ouverture);
        fenetre(
            AGC.citrouille(64) + "<h2>" + (N ? "Pas avant la nuit…" : "Patience, petit monstre…") + "</h2>" +
            "<p>" + (dejaOuverte
                ? "La chasse a lieu " + plageTexte + ", " + jusquau + "."
                : "La chasse ouvre le " + AGC.dateLongue(P.ouverture) + heureOuverture +
                  (plageTexte ? ", puis " + plageTexte : "") + (jusquau ? ", " + jusquau : "") + ".") +
            '<br>Prochaine ouverture dans <b data-rebours="' + prochaine + '">' + AGC.texteRebours(prochaine) + "</b></p>",
            [{ texte: "Retour", action: retour }]
        );
        AGC.animerRebours();
        setInterval(() => { if (AGC.estOuvert(id)) location.reload(); }, 5000);
    } else if (N) {
        // Mode nuit : une fenêtre à chaque ouverture, car le son ne peut démarrer qu'après un geste
        const regles = etat.introVue ? "" :
            '<ul class="regles">' +
            '<li><i class="fa-solid fa-moon"></i><span>La chasse n\'existe que la nuit' + (plageTexte ? ", " + plageTexte : "") + (jusquau ? ", " + jusquau : "") + ".</span></li>" +
            '<li><i class="fa-solid fa-headphones"></i><span>Monte le son, ou mieux : mets des écouteurs. Murmures et battements de cœur trahissent les citrouilles… et la nuit n\'est jamais silencieuse.</span></li>' +
            '<li><i class="fa-solid fa-ear-listen"></i><span>Les ' + N.audioSeul + " dernières cibles disparaissent de la carte : seule ton oreille pourra les trouver.</span></li>" +
            '<li><i class="fa-solid fa-ban"></i><span>Lampe torche interdite ! C\'est la règle du jeu.</span></li>' +
            '<li><i class="fa-solid fa-person-walking"></i><span>Reste sur les trottoirs et porte un gilet ou un accessoire réfléchissant.</span></li>' +
            "</ul>";
        fenetre(
            '<div class="lettre-geante">🦇</div><h2>' + (etat.introVue ? "De retour dans la nuit…" : P.nom) + "</h2>" + regles +
            '<label class="case-accord" style="text-align:left"><input type="checkbox" id="opt-flash"' + (etat.flash ? " checked" : "") + ">" +
            "<span><b>Effets lumineux avec le flash</b> (Android uniquement, accès caméra demandé). " +
            "Déconseillé aux personnes sensibles aux lumières clignotantes.</span></label>",
            [{
                texte: "Entrer dans la nuit",
                action: el => {
                    const flash = el.querySelector("#opt-flash").checked;
                    etat.introVue = true;
                    etat.flash = flash;
                    AGC.sauver(id, etat);
                    jeuOuvert = true;
                    garderEcran();
                    AGC.Nuit.demarrer(N, flash).then(r => {
                        if (!r.son) toast("Le son n'a pas pu démarrer : vérifie le volume et recharge la page.", "info", 6000);
                        else if (flash && !r.flash) toast("Effets lumineux indisponibles sur ce téléphone.", "info", 5000);
                    });
                    if (fini() && !etat.finalVu) apresDecouverte();
                }
            }]
        );
    } else {
        jeuOuvert = true;
        garderEcran();
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

    // fin de la plage du soir (ou de la chasse) pendant la partie
    if (P.fermeture || P.plage) {
        setInterval(() => {
            if (!jeuOuvert || AGC.estOuvert(id)) return;
            jeuOuvert = false;
            if (N) AGC.Nuit.arreter();
            fenetre(AGC.estTermine(id)
                ? '<div class="lettre-geante">🌅</div><h2>Le jour se lève…</h2><p>La chasse est terminée pour cette année.</p>'
                : '<div class="lettre-geante">🌅</div><h2>Le jour se lève…</h2><p>La chasse reprend ' +
                  (P.plage ? "ce soir à " + AGC.hhmm(P.plage.debut) : "bientôt") + ". Ta progression est gardée sur ce téléphone.</p>",
                [{ texte: "Retour", action: retour }]);
        }, 30000);
    }
})();
