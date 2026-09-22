document.addEventListener("DOMContentLoaded", function () {

    // OpenFreeMap style: 'liberty', 'bright' or 'positron' (https://openfreemap.org/quick_start/)
    var MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

    var MAP_THEME = true;          // recolor the map style to match REDAXO colors (see themeMapStyle)
    var USER_ZOOM = 7;             // zoom level used when a user is opened via URL hash
    var CLUSTER_RADIUS = 30;       // px, radius used to group markers into clusters
    var MAX_ZOOM = 18;             // max zoom of the map
    var MARKER_HEIGHT = 41;        // px, height of the marker icon (used for popup offset)

    // languages available as "name:xx" in OpenMapTiles data (used for map labels)
    var MAP_LANGUAGES = ['af', 'am', 'ar', 'az', 'be', 'bg', 'bn', 'br', 'bs', 'ca', 'co', 'cs', 'cy', 'da', 'de', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'fy', 'ga', 'gd', 'he', 'hi', 'hr', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'ja-Hira', 'ja-Latn', 'ka', 'kk', 'kn', 'ko', 'ko-Latn', 'ku', 'la', 'lb', 'lt', 'lv', 'mk', 'ml', 'mt', 'nl', 'no', 'oc', 'pa', 'pl', 'pnb', 'pt', 'rm', 'ro', 'ru', 'sk', 'sl', 'sq', 'sr', 'sr-Latn', 'sv', 'ta', 'te', 'th', 'tok', 'tr', 'uk', 'ur', 'vi', 'zh', 'zh-Hans', 'zh-Hant'];

    var mapContainer = document.getElementById('map');
    var markerIcon = mapContainer.getAttribute('data-marker-icon');
    var documentTitle = document.title;


    /* ---------------------------------------------------------------------
     * data
     * ------------------------------------------------------------------ */

    // build GeoJSON from directory entries
    var geojson = {
        type: 'FeatureCollection',
        features: directory.map(function (entry) {
            return {
                type: 'Feature',
                properties: {
                    id: entry.id,
                    name: entry.name
                },
                geometry: {
                    type: 'Point',
                    coordinates: [Number(entry.longitude), Number(entry.latitude)]
                }
            };
        })
    };

    // bounds covering all markers
    var dataBounds = null;
    geojson.features.forEach(function (feature) {
        var coords = feature.geometry.coordinates;
        dataBounds = dataBounds ? dataBounds.extend(coords) : new maplibregl.LngLatBounds(coords, coords);
    });

    // select user data entry by given id
    function getUserEntry(userID) {
        for (var i = 0; i < directory.length; i++) {
            if (directory[i].id === userID) {
                return directory[i];
            }
        }
        return false;
    }

    // popup content for a user
    function getUserContent(entry) {
        var content = '' +
            '<div class="user">';

        if (entry.image) {
            content += '' +
                '<div class="user__image">' +
                    '<img class="user__image-src" src="' + entry.image + '" alt="">' +
                '</div>';
        }

        content += '' +
                '<div class="user__data">';

        if (entry.name) {
            content += '' +
                    '<h2 class="user__name">' + entry.name + '</h2>';
        }

        if (entry.bio) {
            content += '' +
                    '<p class="user__bio">' + entry.bio + '</p>';
        }

        if (entry.links) {
            content += '' +
                    '<div class="user__links">' +
                        '<ul class="user__links-list">';

            for (var j = 0; j < 4; j++) {
                if (entry.links[j]) {
                    var link = entry.links[j];
                    var linkText = link.replace(/(http:\/\/|https:\/\/)/i, '');
                    content += '<li class="user__links-listitem"><a href="' + link + '" target="_blank" rel="noopener noreferrer">' + linkText + '</a></li>';
                }
            }

            content += '' +
                        '</ul>' +
                    '</div>';
        }

        content += '' +
                '</div>' +
            '</div>';

        return content;
    }

    // popup content for several users sharing the same position
    function getListContent(features) {
        var content = '' +
            '<div class="userlist">' +
                '<h2 class="userlist__title">' + features.length + ' people at this place</h2>' +
                '<ul class="userlist__list">';

        features.forEach(function (feature) {
            content += '<li class="userlist__item"><a href="#' + feature.properties.id + '">' + feature.properties.name + '</a></li>';
        });

        content += '' +
                '</ul>' +
            '</div>';

        return content;
    }


    /* ---------------------------------------------------------------------
     * URL hash
     * handles URL hash for location (like #3,45.8288,20.74219) and user profile (like #johndoe)
     *
     * - sets location hash on moving the map or zooming into it
     * - sets user hash on opening popups and keeps it until closed
     * - sets either location hash or user hash, doesn’t mix both at once
     * ------------------------------------------------------------------ */

    function getHash() {
        var hash = window.location.hash.slice(1);
        return hash.length > 0 ? decodeURIComponent(hash) : false;
    }

    function getHashType(hash) {
        if (hash) {
            var args = hash.split(',');
            if (args.length === 3) {
                return 'location';
            }
            if (args.length === 1) {
                return 'user';
            }
        }
        return false;
    }

    function parseLocationHash(hash) {
        var args = hash.split(',');
        var location = {
            zoom: Number(args[0]),
            lat: Number(args[1]),
            lng: Number(args[2])
        };
        if (isNaN(location.zoom) || isNaN(location.lat) || isNaN(location.lng)) {
            return false;
        }
        return location;
    }

    function setLocationHash() {
        var center = map.getCenter();
        window.history.replaceState(null, '', '#' + [
            Math.round(map.getZoom() * 100) / 100,
            Math.round(center.lat * 100000) / 100000,
            Math.round(center.lng * 100000) / 100000
        ].join(','));
    }

    function setUserHash(userID) {
        window.history.replaceState(null, '', '#' + userID);
    }


    /* ---------------------------------------------------------------------
     * map language
     * shows map labels in the browser language if available in the map data
     * ------------------------------------------------------------------ */

    // pick the first browser language available in the map data ('de-DE' -> 'de', 'zh-Hans' stays)
    function getMapLanguage() {
        var preferred = navigator.languages || [navigator.language || navigator.userLanguage];
        for (var i = 0; i < preferred.length; i++) {
            var tag = String(preferred[i] || '');
            var base = tag.split('-')[0].toLowerCase();
            var candidates = [tag, base];
            for (var j = 0; j < candidates.length; j++) {
                if (MAP_LANGUAGES.indexOf(candidates[j]) !== -1) {
                    return candidates[j];
                }
            }
        }
        return false;
    }

    // rewrite all label layers of the style: prefer "name:<language>", fall back to the style’s default
    function localizeMapLabels(language) {
        if (!language) {
            return;
        }
        map.getStyle().layers.forEach(function (layer) {
            if (layer.type !== 'symbol' || !layer.layout || !layer.layout['text-field']) {
                return;
            }
            var textField = layer.layout['text-field'];
            if (JSON.stringify(textField).indexOf('"name') === -1) {
                return; // e.g. road shields using "ref"
            }
            map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:' + language], textField]);
        });
    }


    /* ---------------------------------------------------------------------
     * map theme
     * recolors the OpenFreeMap style to match REDAXO colors
     * (blue #3fb4ff, light blue #87d1ff, dark blue #266d99, neon #deff25),
     * with a light and a dark variant following the OS/browser color scheme
     * ------------------------------------------------------------------ */

    // [layer id or RegExp matching layer ids, paint property, light value, dark value]
    var MAP_THEME_RULES = [
        // land and water
        ['background', 'background-color', '#f4f9fd', '#1b2631'],
        ['water', 'fill-color', '#a9dcff', '#143d5c'],
        [/^waterway_/, 'line-color', '#8fd0ff', '#1d5079'],

        // landcover and landuse
        ['park', 'fill-color', '#e6f4cf', '#223a30'],
        ['park', 'fill-outline-color', 'rgba(190, 220, 120, 1)', 'rgba(60, 100, 70, 1)'],
        ['park_outline', 'line-color', '#d3e8b3', '#2c4a3a'],
        ['landuse_residential', 'fill-color', 'rgba(230, 238, 245, 0.7)', 'rgba(40, 55, 70, 0.5)'],
        ['landcover_wood', 'fill-color', 'rgba(205, 232, 175, 0.7)', 'rgba(40, 70, 55, 0.6)'],
        ['landcover_grass', 'fill-color', '#d9ecc0', '#24392f'],
        ['landcover_ice', 'fill-color', '#eef5f8', '#26333c'],
        ['landcover_sand', 'fill-color', '#f6f1d9', '#2b3138'],
        [/^landuse_(pitch|track|cemetery)$/, 'fill-color', '#e3efd0', '#243a33'],
        ['landuse_hospital', 'fill-color', '#f5edf2', '#33303a'],
        ['landuse_school', 'fill-color', '#eef2dc', '#2c3630'],
        ['aeroway_fill', 'fill-color', '#e7eef3', '#263440'],
        [/^aeroway_(runway|taxiway)$/, 'line-color', '#f1f5f8', '#2f3f4c'],

        // buildings
        ['building', 'fill-color', '#dfe8ef', '#2c3a47'],
        ['building', 'fill-outline-color', '#cbd8e3', '#1e2a34'],

        // roads (casings first, then fills)
        [/motorway(_link)?_casing$/, 'line-color', '#c2cf5a', '#6f7f20'],
        [/trunk_primary_casing$/, 'line-color', '#cfd982', '#3e4a1f'],
        [/(secondary_tertiary|_link)_casing$/, 'line-color', '#d6dea3', '#2f3826'],
        [/(street|minor|service_track)_casing$/, 'line-color', '#cfdae4', '#22303c'],
        [/path_pedestrian_casing$/, 'line-color', '#d5dfe8', '#22303c'],
        [/motorway(_link)?$/, 'line-color', '#e9ff7a', '#a3b83a'],
        [/trunk_primary$/, 'line-color', '#f3ffb0', '#66762b'],
        [/(secondary_tertiary|_link)$/, 'line-color', '#faffd6', '#4a5738'],
        [/(street|minor|service_track|path_pedestrian)$/, 'line-color', '#ffffff', '#3a4d5e'],
        [/rail/, 'line-color', '#b8c7d3', '#4a5c6b'],
        ['road_area_pattern', 'fill-opacity', 1, 0.15],

        // boundaries
        [/^boundary_(2|disputed)$/, 'line-color', '#6c9cbd', '#5f8bb0'],
        ['boundary_3', 'line-color', '#a8c6dc', '#3f5f7a'],

        // labels
        [/./, 'text-halo-color', 'rgba(255, 255, 255, 0.8)', 'rgba(27, 38, 49, 0.85)'],
        [/^label_country/, 'text-color', '#266d99', '#87d1ff'],
        [/^label_(state|city|city_capital|town|village|other)$/, 'text-color', '#1f3a4d', '#e6f0f7'],
        [/^water_name_/, 'text-color', '#266d99', '#6fbdf0'],
        ['waterway_line_label', 'text-color', '#5aa6d8', '#5aa6d8'],
        [/^poi_r/, 'text-color', '#5f7a8d', '#9fb6c8'],
        ['poi_transit', 'text-color', '#266d99', '#87d1ff'],
        ['airport', 'text-color', '#5f7a8d', '#9fb6c8'],
        [/^highway-name-/, 'text-color', '#6b8396', '#9fb6c8']
    ];

    // layers hidden in both themes: shaded relief raster and 3D buildings (flat, clean look)
    var MAP_THEME_HIDDEN = [/^natural_earth/, 'building-3d'];

    var darkSchemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function getColorScheme() {
        return darkSchemeQuery && darkSchemeQuery.matches ? 'dark' : 'light';
    }

    function matchesLayer(match, layer) {
        return match instanceof RegExp ? match.test(layer.id) : layer.id === match;
    }

    function themeMapStyle() {
        var style = MAP_THEME ? map.getStyle() : null;
        if (!style) {
            return;
        }
        var scheme = getColorScheme();
        var layers = style.layers;

        layers.forEach(function (layer) {
            MAP_THEME_HIDDEN.forEach(function (match) {
                if (matchesLayer(match, layer)) {
                    map.setLayoutProperty(layer.id, 'visibility', 'none');
                }
            });
        });

        MAP_THEME_RULES.forEach(function (rule) {
            layers.forEach(function (layer) {
                // apply to matching layers whose type fits the property (e.g. "fill-color" on fill layers)
                if (matchesLayer(rule[0], layer) && rule[1].indexOf(layer.type + '-') === 0) {
                    map.setPaintProperty(layer.id, rule[1], scheme === 'dark' ? rule[3] : rule[2]);
                }
            });
        });

        document.documentElement.setAttribute('data-map-scheme', scheme);
    }


    /* ---------------------------------------------------------------------
     * map
     * ------------------------------------------------------------------ */

    // initial view: location hash, user hash or bounds of all markers
    var initialView = {};
    var initialHash = getHash();
    var initialLocation = getHashType(initialHash) === 'location' ? parseLocationHash(initialHash) : false;
    var initialUser = getHashType(initialHash) === 'user' ? getUserEntry(initialHash) : false;

    if (initialLocation) {
        initialView.center = [initialLocation.lng, initialLocation.lat];
        initialView.zoom = initialLocation.zoom;
    }
    else if (initialUser) {
        initialView.center = [Number(initialUser.longitude), Number(initialUser.latitude)];
        initialView.zoom = USER_ZOOM;
    }
    else if (dataBounds) {
        initialView.bounds = dataBounds;
        initialView.fitBoundsOptions = { padding: 70 };
    }

    var map = new maplibregl.Map(Object.assign({
        container: mapContainer,
        style: MAP_STYLE,
        minZoom: 2,
        maxZoom: MAX_ZOOM,
        // don’t drag map outside the world
        // (not exactly ±180: MapLibre 5.24 throws in its constrain code for full-width bounds)
        maxBounds: [[-179.9, -70], [179.9, 82]],
        renderWorldCopies: false,
        attributionControl: { compact: false }
    }, initialView));

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

    // popup (single instance, reused for all users)
    var popup = new maplibregl.Popup({
        maxWidth: '450px',
        offset: {
            'top': [0, 0],
            'top-left': [0, 0],
            'top-right': [0, 0],
            'bottom': [0, -MARKER_HEIGHT],
            'bottom-left': [0, -MARKER_HEIGHT],
            'bottom-right': [0, -MARKER_HEIGHT],
            'left': [12, -MARKER_HEIGHT / 2],
            'right': [-12, -MARKER_HEIGHT / 2]
        }
    });

    // open popup for given user
    function openUser(userID) {
        var entry = getUserEntry(userID);
        if (!entry) {
            return false;
        }
        if (popup.isOpen()) {
            popup.remove(); // close first so that the close handler doesn’t reset the new user ID
        }
        popup.userID = entry.id;
        popup
            .setLngLat([Number(entry.longitude), Number(entry.latitude)])
            .setHTML(getUserContent(entry))
            .addTo(map);
        return true;
    }

    // open popup listing several users at the same position
    function openList(coordinates, features) {
        if (popup.isOpen()) {
            popup.remove();
        }
        popup.userID = null;
        popup
            .setLngLat(coordinates)
            .setHTML(getListContent(features))
            .addTo(map);
    }

    popup.on('open', function () {
        if (popup.userID) {
            var entry = getUserEntry(popup.userID);
            setUserHash(popup.userID);
            document.title = entry.name + ' @ ' + documentTitle;
        }
    });

    popup.on('close', function () {
        popup.userID = null;
        document.title = documentTitle;
        setLocationHash();
    });

    // theme and map labels in browser language
    map.on('style.load', function () {
        themeMapStyle();
        localizeMapLabels(getMapLanguage());
    });

    // follow live changes of the color scheme
    if (darkSchemeQuery) {
        if (darkSchemeQuery.addEventListener) {
            darkSchemeQuery.addEventListener('change', themeMapStyle);
        }
        else if (darkSchemeQuery.addListener) {
            darkSchemeQuery.addListener(themeMapStyle);
        }
    }

    map.on('load', function () {

        // marker icon (own name, the style’s sprite already contains a "marker" image)
        map.loadImage(markerIcon).then(function (image) {
            map.addImage('people-marker', image.data, { pixelRatio: 2 });

            // markers with clustering
            map.addSource('people', {
                type: 'geojson',
                data: geojson,
                maxzoom: MAX_ZOOM + 1,
                cluster: true,
                clusterRadius: CLUSTER_RADIUS,
                clusterMaxZoom: MAX_ZOOM // keep clustering at all zoom levels (users sharing one position)
            });

            map.addLayer({
                id: 'people-markers',
                type: 'symbol',
                source: 'people',
                filter: ['!', ['has', 'point_count']],
                layout: {
                    'icon-image': 'people-marker',
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true
                }
            });

            map.addLayer({
                id: 'people-clusters',
                type: 'circle',
                source: 'people',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-radius': 15,
                    'circle-color': 'rgba(63, 180, 255, 0.6)',
                    'circle-stroke-width': 5,
                    'circle-stroke-color': 'rgba(135, 209, 255, 0.6)'
                }
            });

            map.addLayer({
                id: 'people-cluster-count',
                type: 'symbol',
                source: 'people',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': ['get', 'point_count_abbreviated'],
                    'text-font': ['Noto Sans Bold'],
                    'text-size': 14,
                    'text-allow-overlap': true,
                    'text-ignore-placement': true
                },
                paint: {
                    'text-color': 'rgba(255, 255, 255, 0.9)'
                }
            });
        });

        // click on cluster: zoom to the bounds of its members,
        // or list them if they can’t be separated by zooming in (same position)
        map.on('click', 'people-clusters', function (e) {
            var feature = e.features[0];
            var clusterId = feature.properties.cluster_id;
            var coordinates = feature.geometry.coordinates.slice();
            var source = map.getSource('people');

            source.getClusterLeaves(clusterId, 1000, 0).then(function (leaves) {
                var bounds = new maplibregl.LngLatBounds();
                leaves.forEach(function (leaf) {
                    bounds.extend(leaf.geometry.coordinates);
                });

                // all members share (almost) the same position: list them
                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                if (Math.abs(ne.lng - sw.lng) + Math.abs(ne.lat - sw.lat) < 0.0001) {
                    openList(coordinates, leaves);
                    return;
                }

                var camera = map.cameraForBounds(bounds, {
                    padding: 70,
                    maxZoom: MAX_ZOOM
                });

                if (camera && camera.zoom > map.getZoom() + 0.5) {
                    map.easeTo(camera);
                }
                else {
                    openList(coordinates, leaves);
                }
            });
        });

        // click on marker: open popup
        map.on('click', 'people-markers', function (e) {
            openUser(e.features[0].properties.id);
        });

        // pointer cursor on markers and clusters
        ['people-markers', 'people-clusters'].forEach(function (layer) {
            map.on('mouseenter', layer, function () {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layer, function () {
                map.getCanvas().style.cursor = '';
            });
        });

        // open user from initial hash
        if (initialUser) {
            openUser(initialUser.id);
        }
    });

    // keep location hash up to date (unless a user popup is open)
    map.on('moveend', function () {
        if (!popup.isOpen() || !popup.userID) {
            setLocationHash();
        }
    });

    // react on hash changes (links like <a href="#johndoe">, browser navigation)
    window.addEventListener('hashchange', function () {
        var hash = getHash();
        var type = getHashType(hash);

        if (type === 'user') {
            var entry = getUserEntry(hash);
            if (entry && popup.userID !== entry.id) {
                map.jumpTo({
                    center: [Number(entry.longitude), Number(entry.latitude)],
                    zoom: Math.max(map.getZoom(), USER_ZOOM)
                });
                openUser(entry.id);
            }
        }
        else if (type === 'location') {
            var location = parseLocationHash(hash);
            if (location) {
                if (popup.isOpen()) {
                    popup.remove();
                }
                map.jumpTo({
                    center: [location.lng, location.lat],
                    zoom: location.zoom
                });
            }
        }
    });


    /* ---------------------------------------------------------------------
     * info popover
     * ------------------------------------------------------------------ */

    var popover = document.getElementById('popover');
    var popoverOpen = document.getElementById('popover-open');
    var popoverClose = document.getElementById('popover-close');

    popoverOpen.addEventListener('click', function () {
        popover.classList.toggle('popover--active');
    });

    popoverClose.addEventListener('click', function () {
        popover.classList.toggle('popover--active');
    });

    document.addEventListener('keydown', function (e) {
        // ESC
        if (e.key === 'Escape' || e.which == 27) {
            popover.classList.remove('popover--active');
        }
    });

    // show popover on first visit (if URL does not contain hash)
    var supportsLS = window.localStorage && localStorage.getItem;
    var hasHash = window.location.hash.length > 0;
    if (supportsLS && !hasHash && !localStorage.getItem('isReturningVisitor')) {
        localStorage.setItem('isReturningVisitor', true);
        popover.classList.add('popover--active');
    }
});
