/*
 * Hallo' Village — lieux de la carte (maisons décorées, lieux hantés)
 *
 * Sans serveur :
 *  - les lieux validés sont dans data/lieux.json (+ photos dans data/photos/), publiés avec le site ;
 *  - chaque habitant enregistre ses propositions sur son téléphone (localStorage),
 *    puis les envoie par mail sous forme d'un fichier JSON ;
 *  - les organisateurs valident les propositions reçues avec admin.html, qui produit un nouveau data/lieux.json.
 */
(function () {
    AGC.TYPES_LIEUX = {
        soiree:    { nom: "La soirée",        icone: "fa-star",          fond: "var(--orange)" },
        maison:    { nom: "Maison décorée",   icone: "fa-house-chimney", fond: "var(--orange-fonce)" },
        hante:     { nom: "Lieu hanté",       icone: "fa-ghost",         fond: "var(--violet)" },
        evenement: { nom: "Animation",        icone: "fa-calendar-days", fond: "var(--violet-fonce)" }
    };
    AGC.TYPES_PROPOSABLES = ["maison", "hante"];

    AGC.echap = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    AGC.uuid = function () {
        if (crypto.randomUUID) return crypto.randomUUID();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
        });
    };

    /* ---------- Lieux publiés ---------- */
    AGC.chargerLieuxPublies = async function () {
        try {
            const rep = await fetch("data/lieux.json", { cache: "no-cache" });
            if (!rep.ok) return [];
            const json = await rep.json();
            return Array.isArray(json.lieux) ? json.lieux : [];
        } catch (e) {
            return [];
        }
    };

    /* ---------- Mes propositions (sur ce téléphone) ---------- */
    const CLE = () => "agc" + AGC.config.annee + ":propositions";
    const CLE_AUTEUR = "agc:auteur";

    AGC.mesPropositions = function () {
        try { return JSON.parse(localStorage.getItem(CLE())) || []; } catch (e) { return []; }
    };
    /* Retourne false si le téléphone n'a plus de place (photos trop nombreuses) */
    AGC.sauverPropositions = function (liste) {
        try { localStorage.setItem(CLE(), JSON.stringify(liste)); return true; } catch (e) { return false; }
    };
    AGC.auteur = function (valeur) {
        try {
            if (valeur) localStorage.setItem(CLE_AUTEUR, JSON.stringify(valeur));
            return JSON.parse(localStorage.getItem(CLE_AUTEUR)) || { prenom: "", contact: "" };
        } catch (e) { return valeur || { prenom: "", contact: "" }; }
    };

    /* ---------- Photo : redimensionnée et compressée en JPEG (data URL) ---------- */
    const PHOTO_COTE_MAX = 900;
    const PHOTO_OCTETS_MAX = 250 * 1024;
    AGC.compresserPhoto = function (fichier) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(fichier);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                const echelle = Math.min(1, PHOTO_COTE_MAX / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(img.width * echelle));
                canvas.height = Math.max(1, Math.round(img.height * echelle));
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                let qualite = .8, data = canvas.toDataURL("image/jpeg", qualite);
                while (data.length * .75 > PHOTO_OCTETS_MAX && qualite > .4) {
                    qualite -= .1;
                    data = canvas.toDataURL("image/jpeg", qualite);
                }
                resolve(data);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image illisible")); };
            img.src = url;
        });
    };

    /* ---------- Envoi des propositions ---------- */
    function nomFichier() {
        const d = new Date(), p = n => String(n).padStart(2, "0");
        return "hallo-village-propositions-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
            "-" + p(d.getHours()) + p(d.getMinutes()) + ".json";
    }

    AGC.fichierPropositions = function (propositions, auteur) {
        const contenu = {
            format: "hallo-village/propositions",
            version: 1,
            annee: AGC.config.annee,
            envoyeLe: new Date().toISOString(),
            auteur: { prenom: auteur.prenom || "", contact: auteur.contact || "" },
            lieux: propositions.map(p => ({
                id: p.id, type: p.type, nom: p.nom, description: p.description || "",
                coords: p.coords, accord: !!p.accord, photo: p.photo || null, creeLe: p.creeLe
            }))
        };
        return new File([JSON.stringify(contenu, null, 2)], nomFichier(), { type: "application/json" });
    };

    function telecharger(fichier) {
        const url = URL.createObjectURL(fichier);
        const a = document.createElement("a");
        a.href = url;
        a.download = fichier.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 0);
    }

    /*
     * Envoie le fichier : menu de partage du téléphone (le fichier est joint au mail),
     * sinon téléchargement + mail pré-rempli à joindre manuellement.
     * Retourne "partage" | "mail" | "annule".
     */
    AGC.envoyerPropositions = async function (propositions, auteur) {
        const fichier = AGC.fichierPropositions(propositions, auteur);
        const email = AGC.config.contact.email;
        const sujet = "Hallo' Village — " + propositions.length + " lieu(x) proposé(s)" + (auteur.prenom ? " par " + auteur.prenom : "");
        const texte = "Bonjour,\n\nVoici mes propositions de lieux pour la carte d'Halloween (" +
            propositions.map(p => AGC.TYPES_LIEUX[p.type].nom + " : " + p.nom).join(", ") +
            ").\nLe fichier " + fichier.name + " est en pièce jointe.\n\n" + (auteur.prenom || "");

        if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
            try {
                await navigator.share({ files: [fichier], title: sujet, text: texte + "\n\nÀ envoyer à : " + email });
                return "partage";
            } catch (e) {
                if (e.name === "AbortError") return "annule";
                // partage refusé par le navigateur : on bascule sur le téléchargement
            }
        }
        telecharger(fichier);
        location.href = "mailto:" + encodeURIComponent(email) +
            "?subject=" + encodeURIComponent(sujet) +
            "&body=" + encodeURIComponent(texte + "\n\n(N'oubliez pas de joindre le fichier téléchargé : " + fichier.name + ")");
        return "mail";
    };
})();
