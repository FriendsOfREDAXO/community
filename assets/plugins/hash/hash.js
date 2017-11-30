/**
 * hash plugin
 * handles URL hash for location (like #3,45.8288,20.74219) and user profile (like #johndoe)
 *
 * behaviour:
 * - doesn’t set hash on initial map request
 * - sets location hash on moving the map or zooming into it
 * - sets user hash on opening popups and keeps it until closed
 * - sets either location hash or user hash, doesn’t mix both at once
 *
 * map requirements:
 * - `map.ready` state to handle immediate events on map load
 * - `map.markers` keeps a reference to the marker cluster
 * - `marker.userID` property to easily select markers
 * - `popup.userID` property to easily select popups
 */

L.Map.include({

    _onHashChange: function () {
        var hash = this._getHash();

        if (!hash || this._isLocationHash(hash)) {
            this._setLocation(hash);
        }
        else if (this._isUserHash(hash)) {
            this._setUser(hash);
        }
    },

    _onMoveEnd: function (e) {
        this._setHash();
    },

    _onPopupOpen: function (e) {
        var userID = e.popup.userID;
        if (userID) {
            var targetEntry = this._getUserEntry(userID);
            var targetMarker = targetEntry ? this._getMarker(targetEntry.id) : false;
            if (targetMarker) {

                // set marker active
                targetMarker.isActive = true;

                // set user hash
                this._setUserHash(userID);

                // update document title
                document.title = targetEntry.name + ' @ ' + this._documentTitle;
            }
        }
    },

    _onPopupClose: function (e) {
        var userID = e.popup.userID;
        if (userID) {
            var targetMarker = this._getMarker(userID);
            if (targetMarker && targetMarker.isActive) {

                // remove marker’s active state
                targetMarker.isActive = false;

                // transfer from map to cluster
                if (!this.markers.hasLayer(targetMarker)) {

                    // remove marker from map
                    this.removeLayer(targetMarker);

                    // add marker to cluster
                    this.markers.addLayer(targetMarker);
                }

                // reset document title
                document.title = this._documentTitle;

                // clear hash and set new location hash
                this._clearHash();
                this._setHash();
            }
        }
    },

    _setLocation: function (hash) {
        var args = hash ? hash.split(',') : [];

        // set up location properties
        var hashObj = {
            zoom: Number(args[0]),
            lat: Number(args[1]),
            lng: Number(args[2])
        };

        // select center position
        var center;
        if (!isNaN(hashObj.lat) && !isNaN(hashObj.lng)) {
            center = new L.LatLng(hashObj.lat, hashObj.lng);
        } else {
            center = this.getCenter();
        }

        // select zoom
        var zoom;
        if (!isNaN(hashObj.zoom)) {
            zoom = hashObj.zoom;
        }

        // update map
        this.setView(center, zoom, {
            animate: false
        });
    },

    _setUser: function (id) {
        // check for existing user entry and get marker
        var targetEntry = this._getUserEntry(id);
        var targetMarker = targetEntry ? this._getMarker(targetEntry.id) : false;
        if (targetMarker) {

            // center map around target marker, use medium zoom
            this.setView([targetEntry.latitude, targetEntry.longitude], 6, {
                animate: false
            });

            // transfer from cluster to map (to allow for popup)
            if (this.markers.hasLayer(targetMarker)) {

                // remove marker from clusters
                this.markers.removeLayer(targetMarker);

                // add marker to map and open popup
                targetMarker.addTo(this);
            }

            // open popup
            targetMarker.openPopup();
        }
    },

    _getUserEntry: function (userID) {
        // select user data entry by given id
        var item = directory.filter(function (entry) {
            return entry.id === userID;
        }, this);
        if (item.length) {
            return item[0];
        }
        return false;
    },

    _getMarker: function (id) {
        var sources = [this, this.markers]; // both map markers and cluster markers
        var targetLayer = false;

        // loop through map layers and cluster layers to find target marker
        sources.forEach(function (source) {
            if (!targetLayer && typeof source.eachLayer === "function") {
                source.eachLayer(function (layer) {
                    if (layer.userID == id && layer instanceof L.Marker) {
                        targetLayer = layer;
                    }
                });
            }
        });
        return targetLayer;
    },

    _getHash: function () {
        var hash = window.location.hash.slice(1);
        if (hash.length > 0) {
            return hash.toString();
        }
        return false;
    },

    _getHashType: function (hash) {
        if (hash.length > 0) {
            var args = hash.split(',');
            if (args.length === 3) {
                return 'location';
            }
            if (args.length === 1) {
                return 'user';
            }
        }
        return false;
    },

    _isLocationHash: function (hash) {
        return (hash && this._getHashType(hash) == 'location');
    },

    _isUserHash: function (hash) {
        return hash && this._getHashType(hash) == 'user';
    },

    _clearHash: function () {
        window.history.replaceState(null, '', window.location.pathname);
    },

    _setHash: function () {
        if (this.ready) {
            var hash = this._getHash();
            if (!hash || this._isLocationHash(hash)) {
                this._setLocationHash();
            }
            else if (this._isUserHash(hash)) {
                this._setUserHash(hash);
            }
        }
    },

    _setLocationHash: function () {
        var center = this.getCenter();
        var zoom = this.getZoom();

        // set hash to current location
        window.history.replaceState(null, '', '#' + [
            L.Util.formatNum(zoom),
            L.Util.formatNum(center.lat),
            L.Util.formatNum(center.lng)
        ].join(','));
    },

    _setUserHash: function (id) {
        // set hash to current user
        window.history.replaceState(null, '', '#' + id);
    }
});

L.Map.addInitHook(function () {
    this.whenReady(function () {

        // save current document title
        this._documentTitle = document.title;

        // bind event handler for hashchange to window
        L.DomEvent.on(window, 'hashchange', this._onHashChange, this);

        // bind event handlers to map
        this.on('moveend', this._onMoveEnd);
        this.on('popupopen', this._onPopupOpen);
        this.on('popupclose', this._onPopupClose);

        // init
        this._onHashChange();
    });
});
