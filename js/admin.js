/*
 * Hallo' Village — validation des lieux proposés (organisateurs)
 * Entrées : data/lieux.json (déjà publiés) + fichiers JSON de propositions reçus par mail.
 * Sortie  : lieux-valides.zip = lieux.json + photos/<id>.jpg, à dézipper dans data/.
 */
(async function () {
    const C = AGC.config;
    const T = AGC.TYPES_LIEUX;
    const $ = id => document.getElementById(id);
    AGC.coque({ page: "admin.html", titre: "Validation des lieux", retour: "carte.html", sansOnglets: true });

    const map = AGC.creerCarte("carte-admin", C.centre, 15);
    const couche = L.layerGroup().addTo(map);

    /* id -> { lieu, publier, source, auteur } */
    const lieux = new Map();

    (await AGC.chargerLieuxPublies()).forEach(l => {
        lieux.set(l.id, { lieu: Object.assign({}, l), publier: true, source: "déjà publié", auteur: null });
    });

    function horodatage(l) { return l.modifieLe || l.envoyeLe || l.creeLe || ""; }

    async function lireFichiers(fichiers) {
        let ajoutes = 0, ignores = [];
        for (const f of fichiers) {
            try {
                const json = JSON.parse(await f.text());
                if (json.format !== "hallo-village/propositions" || !Array.isArray(json.lieux)) throw new Error("format inconnu");
                json.lieux.forEach(l => {
                    if (!l.id || !T[l.type] || !Array.isArray(l.coords)) return;
                    const existant = lieux.get(l.id);
                    // une version plus récente de la même proposition remplace l'ancienne
                    if (existant && existant.source !== "déjà publié" && horodatage(existant.lieu) >= horodatage(l)) return;
                    lieux.set(l.id, {
                        lieu: Object.assign({}, l),
                        publier: existant ? existant.publier : false,
                        source: f.name,
                        auteur: json.auteur || null
                    });
                    ajoutes++;
                });
            } catch (e) {
                ignores.push(f.name + " (" + e.message + ")");
            }
        }
        afficher();
        if (ignores.length) alert("Fichiers ignorés :\n" + ignores.join("\n"));
        else if (!ajoutes) alert("Aucune nouvelle proposition dans ce(s) fichier(s).");
    }

    function afficher() {
        couche.clearLayers();
        const liste = [...lieux.values()].sort((a, b) => (a.source === "déjà publié") - (b.source === "déjà publié"));
        const nbPublies = liste.filter(x => x.publier).length;
        $("resume").innerHTML =
            '<span class="etat"><i class="fa-solid fa-inbox"></i> ' + liste.length + " lieu(x)</span>" +
            '<span class="etat"><i class="fa-solid fa-check" style="color:var(--vert)"></i> ' + nbPublies + " à publier</span>";

        $("fiches").innerHTML = liste.length ? liste.map(x => {
            const l = x.lieu;
            return '<section class="bloc fiche' + (x.publier ? " retenue" : "") + '" data-id="' + AGC.echap(l.id) + '">' +
                (l.photo ? '<img class="fiche-photo" src="' + AGC.echap(l.photo) + '" alt="">' : '<div class="fiche-photo"><i class="fa-solid fa-image"></i></div>') +
                "<div>" +
                '<label class="champ"><select data-champ="type">' +
                Object.keys(T).filter(k => k !== "soiree").map(k => '<option value="' + k + '"' + (k === l.type ? " selected" : "") + ">" + T[k].nom + "</option>").join("") +
                "</select></label>" +
                '<label class="champ"><input data-champ="nom" value="' + AGC.echap(l.nom) + '"></label>' +
                '<label class="champ"><textarea data-champ="description" rows="2">' + AGC.echap(l.description) + "</textarea></label>" +
                '<div class="fiche-meta">' +
                (x.auteur && (x.auteur.prenom || x.auteur.contact) ? "Par " + AGC.echap(x.auteur.prenom || "?") + (x.auteur.contact ? " · " + AGC.echap(x.auteur.contact) : "") + "<br>" : "") +
                AGC.echap(x.source) +
                (l.type === "maison" && !l.accord && x.source !== "déjà publié" ? '<br><span class="alerte"><i class="fa-solid fa-triangle-exclamation"></i> Accord des habitants non coché</span>' : "") +
                "</div></div>" +
                '<div class="fiche-actions"><label><input type="checkbox" data-champ="publier"' + (x.publier ? " checked" : "") + "> Publier</label>" +
                '<button class="bouton discret" data-voir><i class="fa-solid fa-location-dot"></i> Voir</button></div>' +
                "</section>";
        }).join("") : '<p class="aide">Aucun lieu pour l\'instant.</p>';

        liste.forEach(x => {
            const t = T[x.lieu.type];
            L.marker(x.lieu.coords, {
                opacity: x.publier ? 1 : .6,
                icon: L.divIcon({
                    className: "marqueur", iconSize: [34, 34], iconAnchor: [17, 17],
                    html: '<div class="marqueur-lieu' + (x.publier ? "" : " en-attente") + '" style="background:' + t.fond + '"><i class="fa-solid ' + t.icone + '"></i></div>'
                })
            }).bindTooltip(AGC.echap(x.lieu.nom)).addTo(couche);
        });
    }

    $("fiches").addEventListener("input", e => {
        const champ = e.target.dataset.champ;
        const fiche = e.target.closest(".fiche");
        if (!champ || !fiche) return;
        const x = lieux.get(fiche.dataset.id);
        if (champ === "publier") { x.publier = e.target.checked; afficher(); }
        else if (champ === "type") { x.lieu.type = e.target.value; afficher(); }
        else x.lieu[champ] = e.target.value;
    });
    $("fiches").addEventListener("click", e => {
        if (!e.target.closest("[data-voir]")) return;
        const x = lieux.get(e.target.closest(".fiche").dataset.id);
        map.setView(x.lieu.coords, 18);
        if (window.innerWidth < 900) window.scrollTo({ top: 0, behavior: "smooth" });
    });

    /* ---------- Import ---------- */
    $("fichiers").onchange = e => { lireFichiers([...e.target.files]); e.target.value = ""; };
    const depot = $("depot");
    ["dragenter", "dragover"].forEach(ev => depot.addEventListener(ev, e => { e.preventDefault(); depot.classList.add("survol"); }));
    ["dragleave", "drop"].forEach(ev => depot.addEventListener(ev, e => { e.preventDefault(); depot.classList.remove("survol"); }));
    depot.addEventListener("drop", e => lireFichiers([...e.dataTransfer.files]));

    /* ---------- Export ---------- */
    $("exporter").onclick = async () => {
        const retenus = [...lieux.values()].filter(x => x.publier);
        if (!retenus.length && !confirm("Aucun lieu coché : exporter une carte vide ?")) return;
        const zip = new JSZip();
        const dossierPhotos = zip.folder("photos");
        const publies = [];
        for (const x of retenus) {
            const l = x.lieu;
            let photo = null;
            if (l.photo) {
                const nom = l.id + ".jpg";
                try {
                    const blob = await (await fetch(l.photo)).blob();   // data URL ou data/photos/… déjà publié
                    dossierPhotos.file(nom, blob);
                    photo = "data/photos/" + nom;
                } catch (e) { /* photo introuvable : lieu publié sans photo */ }
            }
            // l'auteur et son contact ne sont jamais publiés
            publies.push({ id: l.id, type: l.type, nom: l.nom.trim(), description: (l.description || "").trim(), coords: l.coords, photo });
        }
        zip.file("lieux.json", JSON.stringify({
            format: "hallo-village/lieux", version: 1, misAJourLe: new Date().toISOString(), lieux: publies
        }, null, 2));
        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "lieux-valides.zip";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    };

    afficher();
})();
