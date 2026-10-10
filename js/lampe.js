/*
 * Hallo' Village — recherche d'une caméra dont la lampe (flash) est pilotable depuis le navigateur
 *
 * Deux pièges sur Android (Samsung notamment) :
 *  - « la caméra arrière » (facingMode environment) renvoie souvent l'objectif grand-angle, qui n'a pas de flash :
 *    on essaie donc chaque caméra arrière jusqu'à trouver celle qui a la lampe, puis on la retient ;
 *  - les capacités (dont « torch ») peuvent être vides tant que l'image n'a pas démarré : on attend un peu.
 *
 * AGC.trouverLampe(journal) → { piste, video, label } ou erreur avec .raison = "api" | "refus" | "pas-de-flash"
 */
(function () {
    const CLE = "agc:camera-flash";
    const pause = ms => new Promise(r => setTimeout(r, ms));

    async function capacites(piste) {
        let c = {};
        for (let i = 0; i < 8; i++) {
            c = piste.getCapabilities ? piste.getCapabilities() : {};
            if (c && c.torch) return c;
            if (i >= 3 && c && Object.keys(c).length) return c;   // capacités connues, sans lampe
            await pause(150);
        }
        return c || {};
    }

    async function essayer(video) {
        const flux = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        const piste = flux.getVideoTracks()[0];
        // certaines caméras n'exposent leurs capacités qu'une fois l'image démarrée
        const v = document.createElement("video");
        v.muted = true;
        v.playsInline = true;
        v.srcObject = flux;
        try { await v.play(); } catch (e) { /* lecture refusée : sans importance */ }
        const caps = await capacites(piste);
        return { piste, video: v, caps, label: piste.label || "caméra", deviceId: (piste.getSettings() || {}).deviceId };
    }

    function erreur(message, raison) { const e = new Error(message); e.raison = raison; return e; }

    AGC.trouverLampe = async function (journal) {
        const log = m => { if (journal) journal(m); };
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw erreur("Ce navigateur ne donne pas accès à la caméra", "api");

        let memo = null;
        try { memo = localStorage.getItem(CLE); } catch (e) { /* ignoré */ }
        const essais = [];
        if (memo) essais.push({ deviceId: { exact: memo } });
        essais.push({ facingMode: { ideal: "environment" } });

        const vus = new Set();
        const tenter = async contraintes => {
            let r;
            try { r = await essayer(contraintes); }
            catch (e) {
                if (e.name === "NotAllowedError" || e.name === "SecurityError") throw erreur("Accès à la caméra refusé", "refus");
                log("✗ caméra impossible à ouvrir (" + e.name + ")");
                return null;
            }
            vus.add(r.deviceId);
            log((r.caps.torch ? "✓ " : "✗ ") + r.label + (r.caps.torch ? " : flash disponible" : " : pas de flash"));
            if (r.caps.torch) {
                try { localStorage.setItem(CLE, r.deviceId); } catch (e) { /* ignoré */ }
                return r;
            }
            r.piste.stop();   // Android ne permet pas d'ouvrir deux caméras à la fois
            return null;
        };

        for (const c of essais) {
            const r = await tenter(c);
            if (r) return r;
        }
        // les noms des caméras ne sont lisibles qu'après l'autorisation : on passe toutes les autres en revue,
        // les caméras arrière d'abord
        const cameras = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput" && !vus.has(d.deviceId));
        const avant = d => /front|avant|user|selfie/i.test(d.label);
        for (const d of cameras.filter(x => !avant(x)).concat(cameras.filter(avant))) {
            const r = await tenter({ deviceId: { exact: d.deviceId } });
            if (r) return r;
        }
        throw erreur("Aucune caméra de ce téléphone n'a de flash pilotable par le navigateur", "pas-de-flash");
    };
})();
