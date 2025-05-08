document.addEventListener("DOMContentLoaded", function () {

    var USEOSM = false; // use unlimited OSM maps (in case carto maps runs above limits)
    var markers = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 30,
        spiderfyDistanceMultiplier: 2
    });
    
    // Default year range
    var currentYear = new Date().getFullYear() % 100; // Get last two digits of the current year
    var yearRange = { min: 15, max: currentYear };
    console.log(directory);

    function updateMarkers() {
        if (directory.length > 0) {
            // remove all markers
            markers.clearLayers();

            for (var i = 0, max = directory.length; i < max; i++) {
                // check if user is in range
                console.log(directory[i].grade);
                console.log(yearRange.min);
                console.log(yearRange.max);
                if (directory[i].grade < yearRange.min || directory[i].grade > yearRange.max) {
                    continue;
                }

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
                            content += "" + '<li class="user__links-listitem"><a href="' + link + '" target="_blank" rel="noopener noreferrer">' + linkText + "</a></li>";
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

                // add user ID
                // this helps us to determine popups
                popup.userID = directory[i].id;

                // init marker
                var marker = L.marker([directory[i].latitude, directory[i].longitude], {
                    alt: directory[i].name
                }).bindPopup(popup);

                // add user ID
                // this helps us to determine markers
                marker.userID = directory[i].id;

                // add to markers
                marker.addTo(markers);
            }
        }
    }

    // Initialize markers
    updateMarkers();

    // Disable attribution prefix 
    L.Control.Attribution.mergeOptions({
        prefix: false
    });
    
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
        layers: [tiles, markers],
        minZoom: 2,
        preferCanvas: true,
        maxBounds: [[82, -200], [-70, 200]], // fit world, provide extra space to left and right (lng 200 instead of 180)
        maxBoundsViscosity: 1.0, // don’t drag map outside the bounds
        zoomSnap: 0.2,
        scrollWheelZoom: false,
        smoothWheelZoom: true,
        smoothSensitivity: 5,
    });

    // save reference to markers
    // this makes it easier for us to determine marker layers
    map.markers = markers;

    // fit bounds to map so all markers are visible
    if (markers.getLayers().length > 0) {
        map.fitBounds(markers.getBounds(), { padding: [70, 70] });
    } else {
        console.warn("No markers available to fit bounds.");
    }

        // Create a custom control for the slider
        var SliderControl = L.Control.extend({
            options: {
                position: 'topright' // Position of the slider on the map
            },
    
            onAdd: function () {
                var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.style.backgroundColor = 'white';
                container.style.padding = '10px';
                container.style.borderRadius = '5px';
                container.style.boxShadow = '0 0 5px rgba(0,0,0,0.4)';
    
                // Add slider elements
                container.innerHTML = `
                    <label for="year-range">Year Range:</label>
                    <input type="range" id="year-range-min" min="12" max="${currentYear}" value="12" style="width: 100%; margin-bottom: 5px;">
                    <input type="range" id="year-range-max" min="12" max="${currentYear}" value="${currentYear}" style="width: 100%;">
                    <span id="year-range-display">2012 - 20${currentYear}</span>
                `;
    
                // Prevent map interactions when interacting with the slider
                L.DomEvent.disableClickPropagation(container);
    
                // Add event listeners for the sliders
                var yearRangeMin = container.querySelector('#year-range-min');
                var yearRangeMax = container.querySelector('#year-range-max');
                var yearRangeDisplay = container.querySelector('#year-range-display');
    
                function updateYearRange() {
                    yearRange.min = parseInt(yearRangeMin.value);
                    yearRange.max = parseInt(yearRangeMax.value);
                    yearRangeDisplay.textContent = "20" + yearRange.min + " - 20" + yearRange.max;
                    updateMarkers(); // Update markers based on the new range
                }
    
                yearRangeMin.addEventListener("input", updateYearRange);
                yearRangeMax.addEventListener("input", updateYearRange);
    
                return container;
            }
        });
    
        // Add the slider control to the map
        map.addControl(new SliderControl());

    // set map ready
    // this helps us to hold back actions triggered by events
    map.ready = true;

    // handle info popover
    var popover = document.getElementById('popover');
    var popoverOpen = document.getElementById('popover-open');
    var popoverClose = document.getElementById('popover-close');

    popoverOpen.addEventListener('click', function () {
        popover.classList.toggle('popover--active');
    });

    popoverClose.addEventListener('click', function () {
        popover.classList.toggle('popover--active');
    });

    L.DomEvent.on(document, 'keydown', function (e) {
        // ESC
        if (e.which == 27) {
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
