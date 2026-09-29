/*
 * Hallo' Village — mode nuit (chasse adulte) : ambiance sonore, sons de proximité, cris aléatoires, flash
 *
 * AGC.Nuit.demarrer(cfg, avecFlash) doit être appelé DANS un geste utilisateur (clic),
 * sinon les navigateurs bloquent le son. Les sons sont dans sons/*.mp3 (CC0, voir sons/credits.json).
 */
(function () {
    const Nuit = {};
    let ctx = null, sortie = null, cfg = null, actif = false;
    const tampons = {};
    let ambiance = [], murmures = null, coeur = null;
    let intensite = 0;

    const hasard = (min, max) => min + Math.random() * (max - min);
    const choisir = liste => liste[Math.floor(Math.random() * liste.length)];

    async function charger(nom) {
        if (!tampons[nom]) {
            tampons[nom] = fetch("sons/" + nom + ".mp3")
                .then(r => r.arrayBuffer())
                .then(b => new Promise((ok, ko) => ctx.decodeAudioData(b, ok, ko)));
        }
        return tampons[nom];
    }

    function boucle(tampon, volume) {
        const gain = ctx.createGain();
        gain.gain.value = volume;
        gain.connect(sortie);
        const src = ctx.createBufferSource();
        src.buffer = tampon;
        src.loop = true;
        src.connect(gain);
        src.start(0, Math.random() * tampon.duration);   // départ au hasard pour éviter la répétition
        return { src, gain, volume };
    }

    /* Joue un son ponctuel, éventuellement placé à gauche ou à droite (pan de -1 à 1) */
    Nuit.jouer = async function (nom, volume, pan) {
        if (!ctx) return;
        const tampon = await charger(nom);
        const gain = ctx.createGain();
        gain.gain.value = volume == null ? 1 : volume;
        let entree = gain;
        if (pan && ctx.createStereoPanner) {
            const p = ctx.createStereoPanner();
            p.pan.value = pan;
            p.connect(gain);
            entree = p;
        }
        gain.connect(sortie);
        const src = ctx.createBufferSource();
        src.buffer = tampon;
        src.connect(entree);
        src.start();
    };

    /* Sons aléatoires : cle = "etranges" | "cris". L'intervalle dépend de la phase (normale / finale). */
    let finale = false;
    const VOLUMES = { etranges: .8, cris: 1 };
    const prochains = {};
    function planifier(cle) {
        const [min, max] = ((finale && cfg.intervallesFinale) || cfg.intervalles)[cle];
        clearTimeout(prochains[cle]);
        prochains[cle] = setTimeout(async () => {
            if (actif && document.visibilityState === "visible") {
                await Nuit.jouer(choisir(cfg.sons[cle]), VOLUMES[cle], hasard(-.9, .9));
            }
            if (actif) planifier(cle);
        }, hasard(min, max) * 1000);
    }

    /* Passe en cadence « finale » (ou revient en normale) ; replanifie tout de suite */
    Nuit.finale = function (oui) {
        if (finale === !!oui) return;
        finale = !!oui;
        if (actif && cfg) Object.keys(VOLUMES).forEach(planifier);
    };

    Nuit.demarrer = function (config, avecFlash) {
        cfg = config;
        // iPhone : jouer même quand le bouton silencieux est activé (Safari 16.4+)
        try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* non géré */ }

        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return Promise.resolve({ son: false, flash: false });
        ctx = new Ctx();
        ctx.resume();
        // débloque l'audio sur iOS : un son vide joué pendant le geste
        const vide = ctx.createBufferSource();
        vide.buffer = ctx.createBuffer(1, 1, 22050);
        vide.connect(ctx.destination);
        vide.start(0);

        sortie = ctx.createGain();
        sortie.connect(ctx.destination);
        actif = true;

        const S = cfg.sons;
        const flashPret = avecFlash ? Flash.tester() : Promise.resolve(false);

        const sonPret = Promise.all(S.ambiance.map(([nom, vol]) => charger(nom).then(t => ({ t, vol }))))
            .then(pistes => {
                ambiance = pistes.map(p => boucle(p.t, p.vol));
                return Promise.all([charger(S.murmures), charger(S.coeur)]);
            })
            .then(([m, c]) => {
                murmures = boucle(m, 0);
                coeur = boucle(c, 0);
                Nuit.proximite(intensite);
                planifier("etranges");
                planifier("cris");
                // précharge les sons ponctuels
                S.etranges.concat(S.cris, [S.trouve]).forEach(charger);
                return true;
            })
            .catch(() => false);

        // reprise après verrouillage / changement d'appli
        document.addEventListener("visibilitychange", () => {
            if (!ctx) return;
            if (document.visibilityState === "visible") ctx.resume();
            else ctx.suspend();
        });
        document.addEventListener("pointerdown", () => { if (ctx && ctx.state !== "running") ctx.resume(); });

        return Promise.all([sonPret, flashPret]).then(([son, flash]) => ({ son, flash }));
    };

    /* i : 0 (rien à proximité) → 1 (sur la citrouille) */
    Nuit.proximite = function (i) {
        intensite = i;
        if (!ctx || !murmures) return;
        const t = ctx.currentTime;
        murmures.gain.gain.setTargetAtTime(.9 * Math.pow(i, 1.3), t, .6);
        coeur.gain.gain.setTargetAtTime(Math.min(1, i * 1.3), t, .6);
        coeur.src.playbackRate.setTargetAtTime(.85 + .75 * i, t, .8);
        ambiance.forEach(a => a.gain.gain.setTargetAtTime(a.volume * (1 - .5 * i), t, 1));
    };

    Nuit.proximiteFlash = function (i) { Flash.proximite(i); };

    /* Cri de chauve-souris synthétisé : 3 « chirps » aigus descendants. L'écho passe par un filtre (plus sourd). */
    function cri(debut, volume, echo) {
        let entree = sortie;
        if (echo) {
            const filtre = ctx.createBiquadFilter();
            filtre.type = "lowpass";
            filtre.frequency.value = 3200;
            filtre.connect(sortie);
            entree = filtre;
        }
        for (let k = 0; k < 3; k++) {
            const t = debut + k * .13;
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(echo ? 5200 : 6200, t);
            osc.frequency.exponentialRampToValueAtTime(echo ? 2000 : 2400, t + .09);
            env.gain.setValueAtTime(.0001, t);
            env.gain.exponentialRampToValueAtTime(.45 * volume, t + .006);
            env.gain.exponentialRampToValueAtTime(.0001, t + .1);
            osc.connect(env);
            env.connect(entree);
            osc.start(t);
            osc.stop(t + .12);
        }
    }

    /*
     * Radar : cri immédiat puis écho, d'autant plus tardif et faible que la cible est loin.
     * Retourne le délai de l'écho en secondes (pour synchroniser l'affichage).
     */
    Nuit.sonar = function (distance, portee) {
        const ratio = Math.min(1, distance / portee);
        const delai = .25 + 2.5 * ratio;
        if (ctx) {
            const t = ctx.currentTime + .02;
            cri(t, 1, false);
            cri(t + delai, Math.max(.12, 1 - ratio), true);
        }
        return delai;
    };

    Nuit.trouve = function () {
        if (cfg) Nuit.jouer(cfg.sons.trouve, 1);
        Flash.rafale();
    };

    Nuit.arreter = function () {
        actif = false;
        Object.values(prochains).forEach(clearTimeout);
        if (ctx) ctx.close();
        ctx = null;
        Flash.fermer();
    };

    /* ---------- Flash (Android / Chrome : lampe de la caméra arrière) ---------- */
    const Flash = {
        voulu: false, dispo: false, piste: null, ouverture: null,
        allume: false, minuteur: null, extinction: null, periode: 0,

        async ouvrir() {
            if (this.piste) return true;
            if (!this.ouverture) {
                this.ouverture = navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
                    .then(flux => {
                        const piste = flux.getVideoTracks()[0];
                        const caps = piste.getCapabilities ? piste.getCapabilities() : {};
                        if (!caps.torch) { piste.stop(); return false; }
                        this.piste = piste;
                        return true;
                    })
                    .catch(() => false)
                    .finally(() => { this.ouverture = null; });
            }
            return this.ouverture;
        },
        fermer() {
            clearTimeout(this.minuteur);
            clearTimeout(this.extinction);
            this.minuteur = null;
            this.periode = 0;
            if (this.piste) this.piste.stop();
            this.piste = null;
            this.allume = false;
        },
        regler(on) {
            this.allume = on;
            if (this.piste) this.piste.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {});
        },
        /* demande l'autorisation caméra et vérifie que le flash est pilotable */
        async tester() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
            this.voulu = true;
            this.dispo = await this.ouvrir();
            this.fermer();
            if (!this.dispo) this.voulu = false;
            return this.dispo;
        },
        clignoter() {
            this.regler(!this.allume);
            this.minuteur = setTimeout(() => this.clignoter(), this.periode / 2);
        },
        async proximite(i) {
            if (!this.voulu) return;
            if (i <= 0) {
                if (this.periode) {
                    clearTimeout(this.minuteur);
                    this.minuteur = null;
                    this.periode = 0;
                    this.regler(false);
                    // on garde la caméra ouverte un moment au cas où on revient vers la citrouille
                    this.extinction = setTimeout(() => this.fermer(), 8000);
                }
                return;
            }
            clearTimeout(this.extinction);
            // 1 éclair toutes les 1,6 s au loin → 2,5 éclairs/s tout près (< 3/s, seuil photosensibilité)
            this.periode = 1600 - 1200 * i;
            if (!this.minuteur && await this.ouvrir()) this.clignoter();
        },
        async rafale() {
            if (!this.voulu || !(await this.ouvrir())) return;
            clearTimeout(this.minuteur);
            this.minuteur = null;
            let n = 0;
            const pas = () => {
                this.regler(n % 2 === 0);
                if (++n < 8) setTimeout(pas, 200);
                else { this.regler(false); this.periode = 0; }
            };
            pas();
        }
    };

    AGC.Nuit = Nuit;
})();
