/*
 * Hallo' Village — outils Leaflet partagés (fond de carte sombre, position de l'utilisateur)
 */
(function () {
    AGC.creerCarte = function (idElement, centre, zoom) {
        const map = L.map(idElement, { zoomControl: false, attributionControl: true }).setView(centre, zoom);
        // Plan Google (déjà utilisé en 2025, sans clé) passé en mode nuit par le filtre CSS .tuiles-nuit
        L.tileLayer("https://{s}.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}", {
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
            maxZoom: 20,
            className: "tuiles-nuit",
            attribution: "&copy; Google"
        }).addTo(map);
        return map;
    };

    AGC.distance = function (a, b) {
        const R = 6371000, rad = Math.PI / 180;
        const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    };

    /*
     * Affiche et suit la position de l'utilisateur.
     * rappel(latlng, precision) est appelé à chaque nouvelle position.
     * centrer(latlng) -> booléen : recentrer la carte sur la première position reçue ? (oui par défaut)
     * Retourne { simuler(latlng), position() } ; simuler sert au mode debug.
     */
    AGC.suivrePosition = function (map, rappel, surErreur, centrer) {
        let marqueur = null, cercle = null, premiere = true, simule = false;

        function placer(latlng, precision) {
            if (!marqueur) {
                marqueur = L.marker(latlng, {
                    zIndexOffset: 1000, interactive: false,
                    icon: L.divIcon({ className: "marqueur", iconSize: [20, 20], iconAnchor: [10, 10], html: '<div class="marqueur-moi"></div>' })
                }).addTo(map);
                cercle = L.circle(latlng, { radius: precision, color: "#ff8a00", weight: 1, fillOpacity: .1, interactive: false }).addTo(map);
            } else {
                marqueur.setLatLng(latlng);
                cercle.setLatLng(latlng).setRadius(precision);
            }
            if (premiere) {
                if (!centrer || centrer(latlng)) map.setView(latlng, Math.max(map.getZoom(), 17));
                premiere = false;
            }
            rappel(latlng, precision);
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.watchPosition(
                pos => { if (!simule) placer([pos.coords.latitude, pos.coords.longitude], pos.coords.accuracy); },
                err => { if (surErreur) surErreur(err); },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        } else if (surErreur) {
            surErreur({ code: 0, message: "Géolocalisation non disponible" });
        }

        return {
            simuler(latlng) { simule = true; placer(latlng, 5); },
            position() { return marqueur ? marqueur.getLatLng() : null; }
        };
    };
})();
