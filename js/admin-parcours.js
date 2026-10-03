/*
 * Hallo' Village — préparation des parcours sur le terrain (organisateurs)
 *
 * Pour chaque parcours (petits, grands, adultes) : placer les citrouilles (GPS ou viseur, puis glisser
 * pour ajuster), saisir la phrase en syllabes, attribuer une syllabe à chaque citrouille, écrire les
 * énigmes, placer le point secret.
 *
 * Brouillon enregistré sur le téléphone (localStorage), puis export d'un fichier à déposer dans
 * data/parcours.json : l'appli le lit à la place des points de js/config.js.
 *
 * Phrase : syllabes séparées par des tirets, mots séparés par des espaces.
 *   « COR-NE-BI-DOUILLE AI-ME LES CI-TROU-IL-LES » → 11 syllabes, donc 11 citrouilles.
 * Le point secret (facultatif) s'ajoute toujours en fin de phrase.
 */
(async function () {
    const C = AGC.config;
    const $ = id => document.getElementById(id);
    await AGC.parcoursPret;
    AGC.coque({ page: "admin-parcours.html", titre: "Parcours (admin)", retour: "admin.html", sansOnglets: true });

    const IDS = ["petits", "grands", "adultes"];
    const LIMITES = { petits: [1, 7], grands: [10, 12], adultes: [1, 99] };
    const cle = id => "agc-admin:parcours:" + id;

    /* ---------- Phrase ---------- */
    function syllabes(texte) {
        const liste = [];
        (texte || "").trim().split(/\s+/).filter(Boolean).forEach((mot, m) => {
            mot.split("-").filter(Boolean).forEach(s => liste.push({ texte: s, mot: m }));
        });
        return liste;
    }

    /* ---------- Brouillons ---------- */
    /* Reconstruit un brouillon à partir du parcours publié (config + data/parcours.json) */
    function depuisPublie(id) {
        const P = C.parcours[id];
        const mots = [[]], posParId = {};
        let pos = 0;
        P.phrase.forEach(t => {
            if (t === "secret") return;
            if (P.points[t]) { mots[mots.length - 1].push(P.points[t].lettre); posParId[t] = pos++; }
            else if (!t.trim()) mots.push([]);
            else { mots[mots.length - 1].push(t); pos++; }
        });
        const ids = Object.keys(P.points).sort((a, b) => a - b);
        return {
            phrase: mots.filter(m => m.length).map(m => m.join("-")).join(" "),
            points: ids.map(n => ({
                coords: P.points[n].coords, pos: posParId[n] == null ? null : posParId[n],
                enigme: P.points[n].enigme || "", note: P.points[n].note || ""
            })),
            secret: P.secret ? { coords: P.secret.coords, lettre: P.secret.lettre, enigme: P.secret.enigme || "", note: P.secret.note || "" } : null,
            modifie: false
        };
    }
    function chargerBrouillon(id) {
        try { const b = JSON.parse(localStorage.getItem(cle(id))); if (b) return b; } catch (e) { /* ignoré */ }
        return depuisPublie(id);
    }
    const brouillons = {};
    IDS.forEach(id => { brouillons[id] = chargerBrouillon(id); });
    let courant = (() => { try { return localStorage.getItem("agc-admin:onglet") || "grands"; } catch (e) { return "grands"; } })();
    if (!IDS.includes(courant)) courant = "grands";
    const B = () => brouillons[courant];

    function sauver() {
        B().modifie = true;
        try { localStorage.setItem(cle(courant), JSON.stringify(B())); }
        catch (e) { alert("Impossible d'enregistrer sur ce téléphone (stockage plein ?)"); }
        afficher();
    }

    /* Après modification de la phrase : garde chaque citrouille sur sa syllabe si elle existe encore */
    function changerPhrase(nouvelle) {
        const avant = syllabes(B().phrase), apres = syllabes(nouvelle), pris = new Set();
        B().points.forEach(p => {
            if (p.pos == null || !avant[p.pos]) { p.pos = null; return; }
            const txt = avant[p.pos].texte;
            let cible = apres[p.pos] && apres[p.pos].texte === txt && !pris.has(p.pos) ? p.pos
                : apres.findIndex((s, k) => s.texte === txt && !pris.has(k));
            p.pos = cible >= 0 ? cible : null;
            if (p.pos != null) pris.add(p.pos);
        });
        B().phrase = nouvelle;
        sauver();
    }

    /* ---------- Compilation au format de l'appli + contrôles ---------- */
    function compiler(id) {
        const b = brouillons[id], syl = syllabes(b.phrase);
        const erreurs = [], avert = [];
        const idParPos = {};
        b.points.forEach((p, i) => {
            if (p.pos == null || !syl[p.pos]) erreurs.push("Citrouille n°" + (i + 1) + " : aucune syllabe");
            else idParPos[p.pos] = String(i + 1);
        });
        if (!syl.length) erreurs.push("Phrase vide");
        syl.forEach((s, k) => { if (!idParPos[k]) erreurs.push("Syllabe « " + s.texte + " » : aucune citrouille"); });
        const [min, max] = LIMITES[id];
        if (b.points.length > max) avert.push(b.points.length + " citrouilles (maximum conseillé : " + max + ")");
        if (b.points.length && b.points.length < min) avert.push(b.points.length + " citrouilles (minimum conseillé : " + min + ")");
        if (C.parcours[id].nuit) {
            const manque = t => !t.trim() || /à compléter/i.test(t);   // vide ou texte provisoire
            b.points.forEach((p, i) => { if (manque(p.enigme)) avert.push("Citrouille n°" + (i + 1) + " : énigme à écrire"); });
            if (b.secret && manque(b.secret.enigme)) avert.push("Point secret : énigme à écrire");
        }
        if (C.parcours[id].secret && !b.secret) avert.push("Pas de point secret");

        const points = {};
        b.points.forEach((p, i) => {
            const pt = { coords: p.coords, lettre: syl[p.pos] ? syl[p.pos].texte : "?" };
            if (p.enigme.trim()) pt.enigme = p.enigme.trim();
            if (p.note.trim()) pt.note = p.note.trim();
            points[i + 1] = pt;
        });
        const phrase = [];
        syl.forEach((s, k) => {
            if (k > 0 && s.mot !== syl[k - 1].mot) phrase.push(" ");
            phrase.push(idParPos[k] || "?");
        });
        let secret = null;
        if (b.secret) {
            secret = { coords: b.secret.coords, lettre: b.secret.lettre || "🎃" };
            if (b.secret.enigme.trim()) secret.enigme = b.secret.enigme.trim();
            if (b.secret.note.trim()) secret.note = b.secret.note.trim();
            phrase.push(" ", "secret");
        }
        return { points, secret, phrase, erreurs, avert };
    }

    /* ---------- Carte ---------- */
    let fond = "satellite";
    try { fond = localStorage.getItem("agc-admin:fond") || "satellite"; } catch (e) { /* ignoré */ }
    const map = AGC.creerCarte("carte", C.centre, 16, fond);
    const couche = L.layerGroup().addTo(map);
    const ligne = L.polyline([], { color: "#ff8a00", weight: 2, dashArray: "4 6", opacity: .8, interactive: false }).addTo(map);

    let derniere = null;   // { latlng, precision }
    const suivi = AGC.suivrePosition(map, (latlng, precision) => {
        derniere = { latlng, precision };
        const gps = $("gps");
        gps.className = "gps " + (precision <= 6 ? "bon" : precision <= 15 ? "moyen" : "mauvais");
        $("gps-texte").textContent = "GPS ± " + Math.round(precision) + " m";
    }, () => { $("gps-texte").textContent = "GPS indisponible"; }, () => true);

    // garde l'écran allumé pendant la tournée
    try { if ("wakeLock" in navigator) navigator.wakeLock.request("screen").catch(() => {}); } catch (e) { /* ignoré */ }
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && "wakeLock" in navigator) navigator.wakeLock.request("screen").catch(() => {});
    });

    function iconeCitrouille(n, ok) {
        return L.divIcon({
            className: "marqueur", iconSize: [40, 40], iconAnchor: [20, 20],
            html: AGC.citrouille(40, "marqueur-citrouille" + (ok ? "" : " incomplete")) + '<span class="marqueur-num">' + n + "</span>"
        });
    }

    function afficher() {
        const b = B(), syl = syllabes(b.phrase);
        couche.clearLayers();
        b.points.forEach((p, i) => {
            const m = L.marker(p.coords, { draggable: true, icon: iconeCitrouille(i + 1, p.pos != null && syl[p.pos]) })
                .bindTooltip(syl[p.pos] ? syl[p.pos].texte : "?", { permanent: true, direction: "bottom", offset: [0, 16], className: "ap-etiquette" })
                .addTo(couche);
            m.on("dragend", () => { const ll = m.getLatLng(); p.coords = [+ll.lat.toFixed(7), +ll.lng.toFixed(7)]; sauver(); });
            m.on("click", () => editerPoint(i));
        });
        if (b.secret) {
            const m = L.marker(b.secret.coords, {
                draggable: true, zIndexOffset: 500,
                icon: L.divIcon({ className: "marqueur", iconSize: [40, 40], iconAnchor: [20, 20], html: '<div class="marqueur-secret">👻</div>' })
            }).bindTooltip("Secret : " + (b.secret.lettre || "🎃"), { permanent: true, direction: "bottom", offset: [0, 16], className: "ap-etiquette" }).addTo(couche);
            m.on("dragend", () => { const ll = m.getLatLng(); b.secret.coords = [+ll.lat.toFixed(7), +ll.lng.toFixed(7)]; sauver(); });
            m.on("click", editerSecret);
        }
        ligne.setLatLngs(b.points.map(p => p.coords));

        // onglets + résumé
        $("onglets").innerHTML = IDS.map(id => {
            const c = compiler(id);
            return '<button data-onglet="' + id + '"' + (id === courant ? ' class="actif"' : "") + ">" +
                C.parcours[id].nom.replace("Chasse des ", "") +
                ' <span class="ap-pastille ' + (c.erreurs.length ? "ko" : c.avert.length ? "moyen" : "ok") + '">' +
                brouillons[id].points.length + "</span></button>";
        }).join("");
        const c = compiler(courant);
        let longueur = 0;
        for (let k = 1; k < b.points.length; k++) longueur += AGC.distance(b.points[k - 1].coords, b.points[k].coords);
        const affectees = new Set(b.points.map(p => p.pos).filter(p => p != null));
        $("resume").innerHTML =
            '<div class="ap-syllabes">' + (syl.length
                ? syl.map((s, k) => (k > 0 && s.mot !== syl[k - 1].mot ? '<span class="ap-espace"></span>' : "") +
                    '<span class="case ' + (affectees.has(k) ? "trouvee" : "") + '">' + AGC.echap(s.texte) + "</span>").join("") +
                  (b.secret ? '<span class="ap-espace"></span><span class="case trouvee">' + AGC.echap(b.secret.lettre || "🎃") + "</span>" : "")
                : '<span class="ap-vide">Pas encore de phrase : touche « Phrase »</span>') + "</div>" +
            '<div class="ap-etat">' + b.points.length + " citrouille(s) · " + (longueur / 1000).toFixed(2) + " km" +
            (c.erreurs.length ? ' · <b class="ko">' + c.erreurs.length + " à corriger</b>" : c.avert.length ? ' · <b class="moyen">' + c.avert.length + " remarque(s)</b>" : ' · <b class="ok">prêt ✓</b>') +
            (b.modifie ? " · brouillon" : "") + "</div>";
    }

    function cadrer() {
        const pts = B().points.map(p => p.coords);
        if (B().secret) pts.push(B().secret.coords);
        if (pts.length) map.fitBounds(pts, { paddingTopLeft: [20, 150], paddingBottomRight: [20, 110], maxZoom: 18 });
    }

    /* ---------- Fenêtres ---------- */
    function fenetre(html, onClick) {
        const el = document.createElement("div");
        el.className = "fenetre";
        el.setAttribute("role", "dialog");
        el.innerHTML = '<div class="fenetre-boite formulaire">' + html + "</div>";
        el.addEventListener("click", e => {
            if (e.target === el || e.target.closest("[data-fermer]")) { el.remove(); return; }
            if (onClick) onClick(e, el);
        });
        document.body.appendChild(el);
        return el;
    }
    const centre = () => { const c = map.getCenter(); return [+c.lat.toFixed(7), +c.lng.toFixed(7)]; };
    function positionGPS() {
        if (!derniere) { alert("Position GPS pas encore disponible. Utilise le viseur ou patiente quelques secondes."); return null; }
        if (derniere.precision > 15 && !confirm("GPS imprécis (± " + Math.round(derniere.precision) + " m). Placer quand même ?\nTu pourras ensuite faire glisser la citrouille pour corriger.")) return null;
        return [+derniere.latlng[0].toFixed(7), +derniere.latlng[1].toFixed(7)];
    }

    function optionsSyllabes(posActuelle) {
        const syl = syllabes(B().phrase);
        const prises = new Set(B().points.map(p => p.pos).filter(p => p != null && p !== posActuelle));
        return '<option value="">— aucune —</option>' + syl.map((s, k) =>
            '<option value="' + k + '"' + (k === posActuelle ? " selected" : "") + (prises.has(k) ? " disabled" : "") + ">" +
            (k + 1) + ". " + AGC.echap(s.texte) + (prises.has(k) ? " (déjà prise)" : "") + "</option>").join("");
    }

    function editerPoint(i) {
        const p = B().points[i];
        const nuit = !!C.parcours[courant].nuit;
        fenetre(
            "<h2>Citrouille n°" + (i + 1) + "</h2>" +
            '<label class="champ"><span>Syllabe</span><select id="f-syl">' + optionsSyllabes(p.pos) + "</select></label>" +
            '<label class="champ"><span>Énigme ' + (nuit ? "" : "<em>(utilisée seulement en chasse adulte)</em>") + '</span><textarea id="f-enigme" rows="3">' + AGC.echap(p.enigme) + "</textarea></label>" +
            '<label class="champ"><span>Note privée <em>(repère pour les organisateurs, non affichée dans le jeu)</em></span><textarea id="f-note" rows="2">' + AGC.echap(p.note) + "</textarea></label>" +
            '<p class="form-note"><i class="fa-solid fa-hand"></i><span>Pour ajuster la position, fais glisser la citrouille sur la carte.</span></p>' +
            '<div class="ap-boutons"><button class="bouton discret" data-act="gps"><i class="fa-solid fa-location-dot"></i> Ici (GPS)</button>' +
            '<button class="bouton discret" data-act="viseur"><i class="fa-solid fa-crosshairs"></i> Au viseur</button></div>' +
            '<div class="ap-boutons"><button class="bouton discret" data-act="avant"><i class="fa-solid fa-arrow-up"></i> Avancer</button>' +
            '<button class="bouton discret" data-act="apres"><i class="fa-solid fa-arrow-down"></i> Reculer</button></div>' +
            '<button class="bouton" data-act="ok">Enregistrer</button>' +
            '<button class="bouton discret ap-danger" data-act="suppr"><i class="fa-solid fa-trash"></i> Supprimer</button>',
            (e, el) => {
                const act = e.target.closest("[data-act]");
                if (!act) return;
                const lire = () => {
                    const v = el.querySelector("#f-syl").value;
                    p.pos = v === "" ? null : +v;
                    p.enigme = el.querySelector("#f-enigme").value;
                    p.note = el.querySelector("#f-note").value;
                };
                const pts = B().points;
                switch (act.dataset.act) {
                    case "gps": { const c = positionGPS(); if (!c) return; p.coords = c; break; }
                    case "viseur": p.coords = centre(); break;
                    case "avant": if (i > 0) { lire(); [pts[i - 1], pts[i]] = [pts[i], pts[i - 1]]; } break;
                    case "apres": if (i < pts.length - 1) { lire(); [pts[i + 1], pts[i]] = [pts[i], pts[i + 1]]; } break;
                    case "suppr": if (!confirm("Supprimer la citrouille n°" + (i + 1) + " ?")) return; pts.splice(i, 1); el.remove(); sauver(); return;
                }
                if (act.dataset.act !== "avant" && act.dataset.act !== "apres") lire();
                el.remove();
                sauver();
            });
    }

    function ajouter(coords) {
        if (!coords) return;
        const syl = syllabes(B().phrase);
        const prises = new Set(B().points.map(p => p.pos));
        const libre = syl.findIndex((s, k) => !prises.has(k));
        B().points.push({ coords, pos: libre >= 0 ? libre : null, enigme: "", note: "" });
        sauver();
        editerPoint(B().points.length - 1);
    }

    function editerSecret() {
        const s = B().secret || { coords: null, lettre: "🎃", enigme: "", note: "" };
        fenetre(
            "<h2>Point secret</h2>" +
            "<p>Il apparaît quand toutes les citrouilles sont trouvées, et complète la fin de la phrase.</p>" +
            '<label class="champ"><span>Lettre ou emoji révélé</span><input id="f-lettre" maxlength="12" value="' + AGC.echap(s.lettre) + '"></label>' +
            '<label class="champ"><span>Énigme</span><textarea id="f-enigme" rows="3">' + AGC.echap(s.enigme) + "</textarea></label>" +
            '<label class="champ"><span>Note privée</span><textarea id="f-note" rows="2">' + AGC.echap(s.note) + "</textarea></label>" +
            '<div class="ap-boutons"><button class="bouton discret" data-act="gps"><i class="fa-solid fa-location-dot"></i> Ici (GPS)</button>' +
            '<button class="bouton discret" data-act="viseur"><i class="fa-solid fa-crosshairs"></i> Au viseur</button></div>' +
            (s.coords ? '<button class="bouton" data-act="ok">Enregistrer</button>' : "") +
            (B().secret ? '<button class="bouton discret ap-danger" data-act="suppr"><i class="fa-solid fa-trash"></i> Supprimer le point secret</button>' : "") +
            '<button class="bouton discret" data-fermer>Annuler</button>',
            (e, el) => {
                const act = e.target.closest("[data-act]");
                if (!act) return;
                if (act.dataset.act === "suppr") {
                    if (!confirm("Supprimer le point secret ?")) return;
                    B().secret = null; el.remove(); sauver(); return;
                }
                let coords = s.coords;
                if (act.dataset.act === "gps") { coords = positionGPS(); if (!coords) return; }
                if (act.dataset.act === "viseur") coords = centre();
                B().secret = {
                    coords, lettre: el.querySelector("#f-lettre").value.trim() || "🎃",
                    enigme: el.querySelector("#f-enigme").value, note: el.querySelector("#f-note").value
                };
                el.remove();
                sauver();
            });
    }

    function editerPhrase() {
        const c = compiler(courant);
        fenetre(
            "<h2>Phrase secrète</h2>" +
            '<label class="champ"><span>Syllabes séparées par des tirets, mots par des espaces</span>' +
            '<textarea id="f-phrase" rows="3" placeholder="COR-NE-BI-DOUILLE AI-ME LES CI-TROU-IL-LES">' + AGC.echap(B().phrase) + "</textarea></label>" +
            '<p class="form-note"><i class="fa-solid fa-circle-info"></i><span>Une syllabe = une citrouille. Le point secret s\'ajoute automatiquement à la fin. ' +
            "Conseillé : " + (courant === "petits" ? "7 citrouilles maximum" : courant === "grands" ? "10 à 12 citrouilles" : "au choix") + ".</span></p>" +
            (c.erreurs.length || c.avert.length
                ? '<ul class="ap-controles">' + c.erreurs.map(t => '<li class="ko">✗ ' + AGC.echap(t) + "</li>").join("") +
                  c.avert.map(t => '<li class="moyen">! ' + AGC.echap(t) + "</li>").join("") + "</ul>"
                : '<p class="ap-controles ok">✓ Parcours complet</p>') +
            '<button class="bouton" data-act="ok">Enregistrer</button>' +
            '<button class="bouton discret" data-fermer>Annuler</button>',
            (e, el) => {
                if (!e.target.closest("[data-act]")) return;
                const v = el.querySelector("#f-phrase").value.replace(/\s+/g, " ").trim();
                el.remove();
                changerPhrase(v);
            });
    }

    /* ---------- Fichier : export / import / reprise ---------- */
    function nomFichier(ext) {
        const d = new Date(), p = n => String(n).padStart(2, "0");
        return "hallo-village-parcours-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + "." + ext;
    }
    function contenuExport() {
        const parcours = {}, ignores = [];
        IDS.forEach(id => {
            const c = compiler(id);
            if (c.erreurs.length) ignores.push(C.parcours[id].nom);
            else parcours[id] = { points: c.points, secret: c.secret, phrase: c.phrase };
        });
        return {
            ignores,
            json: {
                format: "hallo-village/parcours", version: 1, misAJourLe: new Date().toISOString(),
                parcours,              // lu par l'appli (seulement les parcours sans erreur)
                brouillons             // pour reprendre l'édition sur un autre appareil
            }
        };
    }

    function ouvrirFichier() {
        const lignes = IDS.map(id => {
            const c = compiler(id);
            return "<li><b>" + C.parcours[id].nom + "</b> : " + brouillons[id].points.length + " citrouille(s) — " +
                (c.erreurs.length ? '<span class="ko">' + c.erreurs.length + " à corriger, non exporté</span>"
                    : c.avert.length ? '<span class="moyen">' + c.avert.length + " remarque(s)</span>" : '<span class="ok">prêt ✓</span>') + "</li>";
        }).join("");
        fenetre(
            "<h2>Fichier des parcours</h2>" +
            '<ul class="ap-controles">' + lignes + "</ul>" +
            '<p class="form-note"><i class="fa-solid fa-circle-info"></i><span>Le fichier est à déposer dans <b>data/parcours.json</b> du site (puis publier). ' +
            "Il contient aussi les brouillons, pour continuer sur un autre appareil.</span></p>" +
            '<button class="bouton" data-act="partager"><i class="fa-solid fa-share-nodes"></i> Partager le fichier</button>' +
            '<button class="bouton discret" data-act="telecharger"><i class="fa-solid fa-download"></i> Télécharger le fichier</button>' +
            '<label class="bouton discret ap-import"><input type="file" id="f-import" accept=".json,.txt,application/json,text/plain" hidden><i class="fa-solid fa-file-import"></i> Importer un fichier</label>' +
            '<button class="bouton discret ap-danger" data-act="reprendre"><i class="fa-solid fa-rotate-left"></i> Repartir de la version en ligne (' + C.parcours[courant].nom.replace("Chasse des ", "") + ")</button>" +
            '<button class="bouton discret" data-fermer>Fermer</button>',
            async (e, el) => {
                const act = e.target.closest("[data-act]");
                if (!act) return;
                const { json, ignores } = contenuExport();
                const texte = JSON.stringify(json, null, 2);
                if (ignores.length && (act.dataset.act === "partager" || act.dataset.act === "telecharger") &&
                    !confirm("Non exportés car incomplets : " + ignores.join(", ") + ".\nExporter quand même les autres (et tous les brouillons) ?")) return;
                if (act.dataset.act === "partager") {
                    for (const ext of ["json", "txt"]) {
                        const f = new File([texte], nomFichier(ext), { type: ext === "json" ? "application/json" : "text/plain" });
                        if (navigator.canShare && navigator.canShare({ files: [f] })) {
                            try { await navigator.share({ files: [f], title: "Parcours Hallo' Village" }); return; }
                            catch (err) { if (err.name === "AbortError") return; break; }
                        }
                    }
                    alert("Le partage n'est pas disponible ici : utilise « Télécharger le fichier ».");
                } else if (act.dataset.act === "telecharger") {
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(new Blob([texte], { type: "application/json" }));
                    a.download = nomFichier("json");
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
                } else if (act.dataset.act === "reprendre") {
                    if (!confirm("Effacer le brouillon « " + C.parcours[courant].nom + " » de ce téléphone et repartir de la version en ligne ?")) return;
                    try { localStorage.removeItem(cle(courant)); } catch (err) { /* ignoré */ }
                    brouillons[courant] = depuisPublie(courant);
                    el.remove();
                    afficher();
                    cadrer();
                }
            });
        $("f-import").onchange = async e => {
            const f = e.target.files[0];
            if (!f) return;
            try {
                const json = JSON.parse(await f.text());
                if (json.format !== "hallo-village/parcours") throw new Error("ce n'est pas un fichier de parcours");
                const src = json.brouillons || {};
                const trouves = IDS.filter(id => src[id] && Array.isArray(src[id].points));
                if (!trouves.length) throw new Error("aucun brouillon dans ce fichier");
                if (!confirm("Remplacer les brouillons de ce téléphone pour : " + trouves.map(id => C.parcours[id].nom).join(", ") + " ?")) return;
                trouves.forEach(id => {
                    brouillons[id] = src[id];
                    try { localStorage.setItem(cle(id), JSON.stringify(src[id])); } catch (err) { /* ignoré */ }
                });
                document.querySelector(".fenetre").remove();
                afficher();
                cadrer();
            } catch (err) {
                alert("Import impossible : " + err.message);
            }
        };
    }

    /* ---------- Boutons ---------- */
    $("onglets").addEventListener("click", e => {
        const b = e.target.closest("[data-onglet]");
        if (!b) return;
        courant = b.dataset.onglet;
        try { localStorage.setItem("agc-admin:onglet", courant); } catch (err) { /* ignoré */ }
        afficher();
        cadrer();
    });
    $("ajout-gps").onclick = () => ajouter(positionGPS());
    $("ajout-viseur").onclick = () => ajouter(centre());
    $("secret").onclick = editerSecret;
    $("phrase").onclick = editerPhrase;
    $("exporter").onclick = ouvrirFichier;
    $("voir-tout").onclick = cadrer;
    $("recentrer").onclick = () => { const p = suivi.position(); if (p) map.setView(p, 19); };
    const majFond = () => { $("fond").innerHTML = '<i class="fa-solid ' + (map._nomFond === "satellite" ? "fa-map" : "fa-satellite") + '"></i>'; };
    $("fond").onclick = () => {
        AGC.changerFond(map, map._nomFond === "satellite" ? "plan" : "satellite");
        try { localStorage.setItem("agc-admin:fond", map._nomFond); } catch (e) { /* ignoré */ }
        majFond();
    };
    majFond();

    afficher();
    cadrer();
})();
