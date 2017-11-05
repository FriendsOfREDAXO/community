document.addEventListener("DOMContentLoaded", function () {

    var USEOSM = false; // use unlimited OSM maps (in case carto maps runs above limits)


    // generate markers
    if (directory.length > 0) {

        var markers = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 40
        });

        for (var i = 0, max = directory.length; i < max; i++) {

            // set popup content
            var content = '' +
                '<div class="user">';

            if (directory[i].image) {
                content += '' +
                    '<div class="user__image">' +
                        '<img class="user__image-src" src="' + directory[i].image + '" alt="">' +
                    '</div>';
            }

            content += '' +
                    '<div class="user__data">';

            if (directory[i].name) {
                content += '' +
                        '<h2 class="user__name">' + directory[i].name + '</h2>';
            }

            if (directory[i].bio) {
                content += '' +
                        '<p class="user__bio">' + directory[i].bio + '</p>';
            }

            if (directory[i].links) {
                content += '' +
                        '<div class="user__links">' +
                            '<ul class="user__links-list">';

                for (var j = 0; j < 4; j++) {
                    if (directory[i]['links'][j]) {
                        var link = directory[i]['links'][j];
                        var linkText = link.replace(/(http:\/\/|https:\/\/)/i, '');
                        content += '' +
                                '<li class="user__links-listitem"><a href="' + link + '">' + linkText + '</a></li>';
                    }
                }

                content += '' +
                            '</ul>' +
                        '</div>';
            }

            content += '' +
                    '</div>' +
                '</div>';

            // init popup
            var popup = L.popup({
                maxWidth: 450
            }).setContent(content);

            // init marker
            L.marker([directory[i].latitude, directory[i].longitude]).bindPopup(popup).addTo(markers);
        }
    }

    // set map attributes
    if (USEOSM) {
        // OSM maps (unlimited)
        var mapAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';
        var mapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var tiles = L.tileLayer(mapUrl, {attribution: mapAttribution});
    }
    else {
        // Carto maps (limited to 75.000 requests)
        var mapAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>';
        var mapUrl = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/{style}/{z}/{x}/{y}@2x.png';
        var tiles = L.tileLayer(mapUrl, {style: 'rastertiles/voyager_labels_under', attribution: mapAttribution});
    }

    // use custom marker icons
    L.Icon.Default.prototype.options.iconUrl = '../../../images/leaflet-icons/marker-icon.png';
    L.Icon.Default.prototype.options.iconRetinaUrl = '../../../images/leaflet-icons/marker-icon-2x.png';

    // generate map
    var map = L.map('map', {
        layers: [tiles, markers]
    });

    // fit bounds to map
    map.fitBounds(markers.getBounds(), {
        padding: [70, 70]
    });

    // handle popover
    var popover = document.getElementById('popover');
    var popoverOpen = document.getElementById('popover-open');
    var popoverClose = document.getElementById('popover-close');

    popoverOpen.addEventListener("click", function () {
        popover.classList.toggle('popover--active');
    });

    popoverClose.addEventListener("click", function () {
        popover.classList.toggle('popover--active');
    });

    document.addEventListener("keydown", function (e) {
        // ESC
        if (e.which == 27) {
            popover.classList.remove('popover--active');
        }
    });

    // show popover on first visit
    var supportsLS = window.localStorage && localStorage.getItem;
    if (supportsLS && !localStorage.getItem('isReturningVisitor')) {
        localStorage.setItem('isReturningVisitor', true);
        popover.classList.add('popover--active');
    }
});
