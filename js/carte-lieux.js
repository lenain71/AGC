/*
 * Hallo' Village — page « Carte du village » : affichage des lieux et propositions des habitants
 */
(async function () {
    const C = AGC.config;
    const T = AGC.TYPES_LIEUX;
    const $ = id => document.getElementById(id);
    AGC.coque({ page: "carte.html", titre: "Carte du village", retour: "accueil.html" });

    const map = AGC.creerCarte("carte", C.centre, 16);
    const suivi = AGC.suivrePosition(map, () => {}, null,
        latlng => AGC.distance(latlng, C.centre) < 3000);

    function toast(texte, duree) {
        const el = document.createElement("div");
        el.className = "toast info";
        el.textContent = texte;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), duree || 3500);
    }

    /* ---------- Marqueurs ---------- */
    function icone(type, enAttente) {
        const t = T[type] || T.evenement;
        return L.divIcon({
            className: "marqueur", iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18],
            html: '<div class="marqueur-lieu' + (enAttente ? " en-attente" : "") + '" style="background:' + t.fond + '">' +
                '<i class="fa-solid ' + t.icone + '"></i></div>'
        });
    }

    function contenuPopup(lieu, mienne) {
        const t = T[lieu.type] || T.evenement;
        return '<div class="popup-lieu">' +
            (lieu.photo ? '<img src="' + AGC.echap(lieu.photo) + '" alt="">' : "") +
            '<span class="popup-type"><i class="fa-solid ' + t.icone + '"></i> ' + t.nom + "</span>" +
            "<b>" + AGC.echap(lieu.nom) + "</b>" +
            (lieu.description ? "<p>" + AGC.echap(lieu.description) + "</p>" : "") +
            (mienne
                ? '<p class="popup-attente"><i class="fa-solid fa-hourglass-half"></i> Ma proposition — ' +
                  (lieu.envoyeLe ? "envoyée, en attente de validation" : "pas encore envoyée") + "</p>" +
                  '<button class="bouton discret" data-modifier="' + lieu.id + '"><i class="fa-solid fa-pen"></i> Modifier</button>'
                : "") +
            "</div>";
    }

    const coucheLieux = L.layerGroup().addTo(map);
    const coucheMiens = L.layerGroup().addTo(map);

    L.marker(C.soiree.coords, { icon: icone("soiree"), zIndexOffset: 400 })
        .bindPopup(contenuPopup({
            type: "soiree", nom: C.soiree.titre,
            description: AGC.dateLongue(C.soiree.date) + " à " + AGC.heure(C.soiree.date) + " — " + C.soiree.lieu
        }))
        .addTo(map);

    const publies = C.lieux.concat(await AGC.chargerLieuxPublies());
    publies.forEach(l => {
        L.marker(l.coords, { icon: icone(l.type) }).bindPopup(contenuPopup(l)).addTo(coucheLieux);
    });

    let propositions = AGC.mesPropositions();

    function afficherMiens() {
        coucheMiens.clearLayers();
        propositions.forEach(p => {
            L.marker(p.coords, { icon: icone(p.type, true), zIndexOffset: 300 })
                .bindPopup(contenuPopup(p, true)).addTo(coucheMiens);
        });
        const n = propositions.length, aEnvoyer = propositions.filter(p => !p.envoyeLe).length;
        $("mes-propositions").hidden = n === 0;
        $("mes-propositions").innerHTML = '<i class="fa-solid fa-map-pin"></i> ' +
            (n > 1 ? "Mes " + n + " propositions" : "Ma proposition") +
            (aEnvoyer ? ' <span class="badge">' + aEnvoyer + " à envoyer</span>" : ' <i class="fa-solid fa-check"></i>');
    }
    afficherMiens();

    map.on("popupopen", e => {
        const b = e.popup.getElement().querySelector("[data-modifier]");
        if (b) b.onclick = () => { map.closePopup(); ouvrirFormulaire(propositions.find(p => p.id === b.dataset.modifier)); };
    });

    $("recentrer").onclick = () => {
        const pos = suivi.position();
        if (pos) map.setView(pos, 18);
        else toast("Position pas encore trouvée…");
    };

    /* ---------- Placement ---------- */
    function modePlacer(actif) {
        $("mode-voir").hidden = actif;
        $("mode-placer").hidden = !actif;
        map.closePopup();
    }
    $("proposer").onclick = () => {
        modePlacer(true);
        const pos = suivi.position();
        if (pos && AGC.distance([pos.lat, pos.lng], C.centre) < 3000) map.setView(pos, 18);
        else map.setZoom(Math.max(map.getZoom(), 17));
    };
    $("placer-annuler").onclick = () => modePlacer(false);
    $("placer-ici").onclick = () => {
        const pos = suivi.position();
        if (pos) map.setView(pos, 19);
        else toast("Position pas encore trouvée : déplace la carte à la main.");
    };
    $("placer-valider").onclick = () => {
        const c = map.getCenter();
        ouvrirFormulaire(null, [+c.lat.toFixed(6), +c.lng.toFixed(6)]);
    };

    /* ---------- Formulaire ---------- */
    const form = $("form-lieu");
    let edition = null;   // { id?, coords, photo }

    function majAccord() {
        const maison = form.type.value === "maison";
        $("bloc-accord").hidden = !maison;
    }
    function majPhoto() {
        $("photo-apercu").hidden = !edition.photo;
        if (edition.photo) $("photo-apercu").src = edition.photo;
        $("photo-retirer").hidden = !edition.photo;
        $("photo-texte").textContent = edition.photo ? "Changer" : "Ajouter une photo";
    }

    function ouvrirFormulaire(proposition, coords) {
        edition = proposition
            ? { id: proposition.id, coords: proposition.coords, photo: proposition.photo || null }
            : { id: null, coords, photo: null };
        form.reset();
        if (proposition) {
            form.type.value = proposition.type;
            form.nom.value = proposition.nom;
            form.description.value = proposition.description || "";
            form.accord.checked = !!proposition.accord;
        }
        $("form-titre").textContent = proposition ? "Modifier ma proposition" : "Proposer un lieu";
        $("form-supprimer").hidden = !proposition;
        $("form-erreur").textContent = "";
        majAccord();
        majPhoto();
        $("formulaire").hidden = false;
    }
    function fermerFormulaire() {
        $("formulaire").hidden = true;
        edition = null;
        modePlacer(false);
    }

    form.addEventListener("change", e => { if (e.target.name === "type") majAccord(); });
    $("form-annuler").onclick = fermerFormulaire;

    $("photo").onchange = async e => {
        const fichier = e.target.files[0];
        e.target.value = "";
        if (!fichier) return;
        try {
            edition.photo = await AGC.compresserPhoto(fichier);
            majPhoto();
        } catch (err) {
            $("form-erreur").textContent = "Photo refusée : " + err.message;
        }
    };
    $("photo-retirer").onclick = () => { edition.photo = null; majPhoto(); };

    form.addEventListener("submit", e => {
        e.preventDefault();
        const erreur = msg => { $("form-erreur").textContent = msg; };
        if (!form.type.value) return erreur("Choisis « Maison décorée » ou « Lieu hanté ».");
        if (!form.nom.value.trim()) return erreur("Donne un nom au lieu.");
        if (form.type.value === "maison" && !form.accord.checked) return erreur("Coche la case d'accord des habitants.");

        const maintenant = new Date().toISOString();
        const ancienne = propositions.find(p => p.id === edition.id);
        const p = {
            id: edition.id || AGC.uuid(),
            type: form.type.value,
            nom: form.nom.value.trim(),
            description: form.description.value.trim(),
            coords: edition.coords,
            accord: form.type.value === "maison" && form.accord.checked,
            photo: edition.photo,
            creeLe: ancienne ? ancienne.creeLe : maintenant,
            modifieLe: maintenant,
            envoyeLe: null           // toute modification doit être renvoyée
        };
        const nouvelles = ancienne ? propositions.map(x => x.id === p.id ? p : x) : propositions.concat(p);
        if (!AGC.sauverPropositions(nouvelles)) {
            return erreur("Plus de place sur ce téléphone : retire la photo ou envoie d'abord tes propositions.");
        }
        propositions = nouvelles;
        afficherMiens();
        fermerFormulaire();
        toast(ancienne ? "Proposition modifiée" : "Lieu enregistré ! Pense à l'envoyer 📨");
    });

    $("form-supprimer").onclick = () => {
        if (!confirm("Supprimer cette proposition ?")) return;
        propositions = propositions.filter(p => p.id !== edition.id);
        AGC.sauverPropositions(propositions);
        afficherMiens();
        fermerFormulaire();
        toast("Proposition supprimée");
    };

    /* ---------- Envoi ---------- */
    const formEnvoi = $("form-envoi");
    $("email-orga").textContent = C.contact.email;

    function listerPropositions() {
        $("liste-propositions").innerHTML = propositions.map(p => {
            const t = T[p.type];
            return '<li><span class="marqueur-lieu' + (p.envoyeLe ? "" : " en-attente") + '" style="background:' + t.fond + '"><i class="fa-solid ' + t.icone + '"></i></span>' +
                "<div><b>" + AGC.echap(p.nom) + "</b><small>" + t.nom + " · " +
                (p.envoyeLe ? '<i class="fa-solid fa-check"></i> envoyée' : "à envoyer") + "</small></div>" +
                '<button type="button" class="barre-btn" data-editer="' + p.id + '" aria-label="Modifier"><i class="fa-solid fa-pen"></i></button></li>';
        }).join("");
    }

    $("mes-propositions").onclick = () => {
        const a = AGC.auteur();
        formEnvoi.prenom.value = a.prenom;
        formEnvoi.contact.value = a.contact;
        listerPropositions();
        $("panneau-envoi").hidden = false;
    };
    $("envoi-fermer").onclick = () => { $("panneau-envoi").hidden = true; };
    $("liste-propositions").addEventListener("click", e => {
        const b = e.target.closest("[data-editer]");
        if (!b) return;
        const p = propositions.find(x => x.id === b.dataset.editer);
        $("panneau-envoi").hidden = true;
        map.setView(p.coords, 18);
        ouvrirFormulaire(p);
    });

    formEnvoi.addEventListener("submit", async e => {
        e.preventDefault();
        const auteur = AGC.auteur({ prenom: formEnvoi.prenom.value.trim(), contact: formEnvoi.contact.value.trim() });
        const resultat = await AGC.envoyerPropositions(propositions, auteur);
        if (resultat === "annule") return;
        const maintenant = new Date().toISOString();
        propositions = propositions.map(p => Object.assign({}, p, { envoyeLe: maintenant }));
        AGC.sauverPropositions(propositions);
        afficherMiens();
        $("panneau-envoi").hidden = true;
        toast(resultat === "partage"
            ? "Merci ! Tes propositions vont être étudiées 🎃"
            : "Fichier téléchargé : joins-le au mail qui vient de s'ouvrir.", 6000);
    });
})();
