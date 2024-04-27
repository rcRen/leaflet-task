var map = L.map("map", {
    center: [45.501, -73.567],
    zoom: 13,
});

L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

var myIcon = L.divIcon({ className: "icon" });

var initialPopupText =
    "<p>You can edit the content of this popup by clicking the edit button.<br/> And you can remove this pin marker by clicking the remove button</p>";

var editLayers = L.featureGroup().addTo(map);

editLayers.on(
    'layeradd layerremove', function (e) {
        // console.info('a', e)
        var layer = e.layer;

        var table = L.DomUtil.get('layers');
        // initial table
        for (let i = 1; i < table.rows.length; i++) {
            table.rows[i].style.display = ''
        }

        if (e.type == 'layeradd') {
            var row = table.insertRow(0);

            var id = row.insertCell(0);
            var shape = row.insertCell(1);
            var popUp = row.insertCell(2);
            var action = row.insertCell(3);

            id.innerHTML = layer._leaflet_id;
            shape.innerHTML = layer._shape;
            popUp.innerHTML = layer._popup ? layer._popup._content : "<button id='add-popup'>Add Text</button>"
            action.innerHTML = "<button id='edit-layer'>Edit Layer</button>"

            L.DomEvent.on(L.DomUtil.get('edit-layer'), 'click', function () {
                _onEdit(layer)
            })

            L.DomEvent.on(L.DomUtil.get('add-popup'), 'click', function () {
                _addPopupText(layer, popUp)
            })
        } else if (e.type == 'layerremove') {
            var rows = table.rows
            for (let i = 0; i < rows.length; i++) {
                if (rows[i].cells[0].innerHTML == layer._leaflet_id) {
                    table.deleteRow(i);
                    break;
                }
            }
        }

    })

//event listener: fire when popup remove btn clicked- remove layer from editLayer featureGroup
L.DomEvent.on(document, 'removeSource', function (e) {
    // console.info(e.detail.layer)
    var layerRemoved = e.detail.layer;
    layerRemoved.removeFrom(editLayers)
})

//event listener: fire when popup save btn clicked- update table on html
L.DomEvent.on(document, 'savePopup', function (e) {
    var layer = e.detail.layer;
    var table = L.DomUtil.get('layers');
    var rows = table.rows;
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].cells[0].innerHTML == layer._leaflet_id) {
            rows[i].cells[2].innerHTML = layer._popup._content
            break;
        }
    }
})


function onSearchClick() {
    var searchText = L.DomUtil.get('search-text').value
    console.info('tt', searchText)

    var table = L.DomUtil.get('layers');
    var rows = table.rows;
    editLayers.eachLayer((layer) => {
        var hasText = layer._popup?._content.includes(searchText)

        if (hasText) {
            //open edit mode on map
            _onEdit(layer)
            //show the record on the table
            for (let i = 1; i < rows.length; i++) {
                if (rows[i].cells[0].innerHTML == layer._leaflet_id) {
                    rows[i].style.display = '' //show the search result on table
                } else {
                    rows[i].style.display = 'none' //hide the row on table
                }

            }
        }
    })
}


function _addPopupText(layer, popUpCell) {
    layer.bindPopup(initialPopupText)
        .openPopup();
    popUpCell.innerHTML = layer._popup ? layer._popup._content : "<button id='addPopup'>add</button>"

}

var resizeMarkersGroup = L.featureGroup().addTo(map);
var moveMarkersGroup = L.featureGroup().addTo(map);

function _onEdit(layer) {
    var tooltip = L.tooltip().setContent('Drag handles to edit or move layer. Right click to finish edit')
    map.on({
        mousemove: function (e) {
            tooltip.setLatLng(e.latlng).addTo(map)
            map.openTooltip(tooltip)

        },
        contextmenu: function (e) {
            if (layer._shape == 'marker') {
                layer.dragging.disable();
                layer._icon.style.cursor = "pointer";
            }
            moveMarkersGroup.clearLayers();
            resizeMarkersGroup.clearLayers()
            map.off('mousemove');
            map.off('contextmenu');
        }
    }

    )

    //initalize featureGroup
    resizeMarkersGroup.clearLayers()
    moveMarkersGroup.clearLayers()

    if (layer._shape) {
        _makeMoveMarker(layer);
        _makeResizeMarker(layer);
    }
}

function _makeMoveMarker(layer) {
    if (layer._shape == 'marker') {
        layer.dragging.enable();
        layer._icon.style.cursor = "move";
        layer.on({
            drag: function (e) {
                layer.setTooltipContent(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`)
                layer.setLatLng(e.latlng).addTo(editLayers)

            },
        }
        )
    } else {
        if (layer._centerPoint) {
            var movePoint = makeMarker(layer._centerPoint, myIcon).addTo(moveMarkersGroup
            );
            movePoint._icon.style.cursor = "move";

            var centerPoint = layer._centerPoint

            var resizePoints = layer._resizePoint

            movePoint.on({
                mousedown: function (e) {
                    resizeMarkersGroup.clearLayers()
                },
                drag: function (e) {
                    var offset, newLatLngs = [];

                    for (let i = 0; i < resizePoints.length; i++) {
                        offset = [
                            resizePoints[i].lat - centerPoint.lat,
                            resizePoints[i].lng - centerPoint.lng,
                        ];
                        newLatLngs.push([
                            e.latlng.lat + offset[0],
                            e.latlng.lng + offset[1],
                        ]);
                    }
                    movePoint.setLatLng(e.latlng).setTooltipContent(
                        `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`
                    );

                    if (layer._shape == 'circle') {
                        layer.setLatLng(e.latlng)
                        layer._centerPoint = e.latlng
                        layer._resizePoint = [L.latLng(layer._centerPoint.lat + offset[0], layer._centerPoint.lng + offset[1])]
                    } else {
                        layer.setLatLngs(newLatLngs)
                        layer._resizePoint = layer.getLatLngs()[0]
                        layer._centerPoint = e.latlng
                    }

                },
                dragend: function () {
                    _makeResizeMarker(layer)
                },
            }

            )
        }
    }
    // map.on('contextmenu', () => {
    //     if (layer._shape == 'marker') {
    //         layer.dragging.disable();
    //         layer._icon.style.cursor = "pointer";
    //     }
    //     moveMarkersGroup.clearLayers();
    //     resizeMarkersGroup.clearLayers()
    //     map.off('contextmenu');
    // })
}

function _makeResizeMarker(layer) {
    // map.on({
    //     contextmenu: () => {
    //         moveMarkersGroup.clearLayers();
    //         resizeMarkersGroup.clearLayers()
    //         map.off('contextmenu');
    //     }
    // })

    //create handle marker on map
    if (layer._shape !== 'marker') {
        var resizePoints = layer._resizePoint;
        var resizeMarker;

        resizePoints.forEach(point => {
            resizeMarker = makeMarker(point, myIcon).addTo(
                resizeMarkersGroup)

            if (layer._shape == 'circle') {
                var center = layer.getBounds().getCenter()
                var newRadius;
                resizeMarker.on({
                    drag: function (e) {
                        newRadius = map.distance(center, e.latlng)
                        resizeMarker.setTooltipContent(`Radius: ${layer.getRadius().toFixed(2)} M`)
                        layer.setRadius(newRadius)
                        layer._resizePoint = [e.latlng]
                    },
                    dragend: function (e) {
                        resizeMarker.off('drag')
                        resizeMarker.off('dragend')
                        finishDrag()
                    },

                })
            }

            if (layer._shape == 'rectangle') {
                var indexOfClickCorner, indexOfOppositeCorner, newBounds;

                resizeMarker.on({
                    drag: function (e) {
                        indexOfClickCorner = resizePoints.indexOf(e.latlng);
                        indexOfOppositeCorner = (indexOfClickCorner + 2) % 4;
                        newBounds = [resizePoints[indexOfOppositeCorner], e.latlng];
                        layer.setBounds(newBounds);
                    },
                    dragend: function () {
                        layer._resizePoint = layer.getLatLngs()[0]
                        layer._centerPoint = layer.getCenter()
                        resizeMarker.off('drag')
                        resizeMarker.off('dragend')
                        finishDrag()
                    },

                })
            }

            if (layer._shape == 'polyline' || layer._shape == 'polygon') {
                var clickMarkerIndex;
                resizeMarker.on({
                    mousedown: function (e) {
                        clickMarkerIndex = resizePoints.indexOf(e.latlng)
                    },
                    drag: function (e) {
                        resizePoints[clickMarkerIndex] = e.latlng;
                        layer.setLatLngs(resizePoints)
                    },
                    dragend: function () {
                        layer._resizePoint = layer._shape == 'polyline' ? layer.getLatLngs() : layer.getLatLngs()[0];
                        layer._shape == 'polygon' && (layer._centerPoint = layer.getCenter());
                        resizeMarker.off('mousedown')
                        resizeMarker.off('drag')
                        resizeMarker.off('dragend')
                        finishDrag()
                    },
                })

            }
        });
        function finishDrag() {
            moveMarkersGroup
                .clearLayers();
            resizeMarkersGroup.clearLayers()
            _makeMoveMarker(layer)
            _makeResizeMarker(layer)
        }
    }
}

function onMarkerClick() {
    var tooltip = L.tooltip().setContent('Click on map to place a marker')

    map.on({
        mousemove: function (e) {
            //change the cursor style when click the action button
            map.getContainer().style.cursor = 'crosshair';

            tooltip.setLatLng(e.latlng).addTo(map)
            map.openTooltip(tooltip)

        },
        click: function (e) {
            var marker = makeMarker(e.latlng);
            marker.addTo(editLayers);
            map.getContainer().style.cursor = 'grab';
            map.off("click");
            map.off("mousemove");
        },
    });
}

function onCircleClick() {
    var circle;
    var tooltip = L.tooltip().setContent('Click and drag to draw circle on map')
    map.on({
        mouseover: function (e) {
            //change the cursor style when click the action button
            map.getContainer().style.cursor = 'crosshair';
            map.on("mousemove", function (e) {
                tooltip.setLatLng(e.latlng).addTo(map)
                map.openTooltip(tooltip)
            });
        },
        mousedown: function (e) {
            map.dragging.disable();
            var startLatlng = e.latlng;
            circle = makeCircle(e.latlng);
            circle.addTo(editLayers);
            map.on("mousemove", function changeCircleRadius(e) {
                var thisLatlng = e.latlng;
                circle.setRadius(map.distance(startLatlng, thisLatlng));
            });
        },
        mouseup: function (e) {
            var radius = circle.getRadius();
            var center = circle.getBounds().getCenter();
            //remove default circle is user just click on the map
            if (radius <= 10) {
                circle.removeFrom(editLayers);
            } else {
                circle._resizePoint = [e.latlng]
                circle._centerPoint = center
            }
            map.dragging.enable();
            map.getContainer().style.cursor = 'grab';
            map.off("mousemove");
            map.off('mouseover')
            map.off("mousedown");
            map.off('mouseup')
        },
    });
}

function onRectangleClick() {
    var rectangle;
    var bounds = [];
    var tooltip = L.tooltip().setContent('Click and drag to draw rectangle on map')
    map.on({
        mouseover: function () {
            //change the cursor style when click the action button
            map.getContainer().style.cursor = 'crosshair';

            map.on("mousemove", function (e) {
                tooltip.setLatLng(e.latlng).addTo(map)
                map.openTooltip(tooltip)
            });
        },
        mousedown: function (e) {
            map.dragging.disable();
            bounds.push(e.latlng, e.latlng);
            rectangle = makeRectangle(bounds).addTo(editLayers);
            map.on("mousemove", function changeRectangleBounds(e) {
                var thisLatlng = e.latlng;
                bounds[1] = thisLatlng;
                rectangle.setBounds(bounds);
            });
        },
        mouseup: function (e) {
            if (bounds[0] == bounds[1]) {
                rectangle.removeFrom(editLayers);
            }
            rectangle._resizePoint = rectangle.getLatLngs()[0]
            rectangle._centerPoint = rectangle.getCenter()
            // map.fitBounds(bounds);
            map.dragging.enable();
            map.getContainer().style.cursor = 'grab';
            map.off("mouseover");
            map.off("mousemove");
            map.off("mousedown");
            map.off('mouseup')
        },
    });
}

function onPolylineClick() {
    var polylineMarkerGroup = L.featureGroup();
    var polyline;
    var tooltip = L.tooltip().setContent('Click to start drawing line on map')
    console.info('tt', tooltip)
    map.on({
        mousemove: function (e) {
            //change the cursor style when click the action button
            map.getContainer().style.cursor = 'crosshair';
            // console.info('t2', tooltip)
            tooltip.setLatLng(e.latlng).addTo(map)
            map.openTooltip(tooltip)
        },
        click: function (e) {
            makeMarker(e.latlng, myIcon).addTo(polylineMarkerGroup);
            polylineMarkerGroup.addTo(map);
            if (polyline) {
                polyline.addLatLng(e.latlng);
                tooltip.setContent('Click to last point to finish drawing')
            } else {
                //create new polyline with an emply array of LatLngs
                polyline = makePolyline().addTo(editLayers);
                polyline.addLatLng(e.latlng); //add first node
            }
        }
    });
    polylineMarkerGroup.on({
        click: function (e) {
            console.info('t3', tooltip)
            let polylineLatLngs = polyline.getLatLngs();
            //when click last point
            if (polylineLatLngs[polylineLatLngs.length - 1] == e.latlng) {
                map.fitBounds(polyline.getBounds(), { maxZoom: 13 });
                //finish drawing line
                polylineMarkerGroup.removeFrom(map);
                polyline._resizePoint = polylineLatLngs
                polylineMarkerGroup.off('click')
                map.getContainer().style.cursor = 'grab';
                map.off('mousemove')
                map.off("click");

            } else {

                makeMarker(e.latlng, myIcon).addTo(polylineMarkerGroup);
                polyline.addLatLng(e.latlng);

            }
        },
    });
}

function onPolygonClick() {
    var polygonMarkerGroup = L.featureGroup().addTo(map);
    var polygonLatLngs = [];
    var polygon, polyline;
    var tooltip = L.tooltip().setContent('Click to start drawing polygon on map')
    map.on({
        mousemove: function (e) {
            //change the cursor style when click the action button
            map.getContainer().style.cursor = 'crosshair';
            tooltip.setLatLng(e.latlng).addTo(map)
            map.openTooltip(tooltip)
        },
        click: function (e) {
            makeMarker(e.latlng, myIcon).addTo(polygonMarkerGroup);
            polygonLatLngs.push(e.latlng);
            if (polygonMarkerGroup.getLayers().length > 2) {
                tooltip.setContent('Click to first point to finish drawing')
                if (polygon) {
                    polygon.addLatLng(e.latlng);
                    makeMarker(e.latlng, myIcon).addTo(polygonMarkerGroup);

                } else {
                    polygon = makePolygon(polygonLatLngs).addTo(editLayers);
                    polyline.removeFrom(map)
                }
            } else {
                polyline = makePolyline(polygonLatLngs).addTo(map)
                tooltip.setContent('At least 3 point to draw a polygon')
            }
        }
    });
    polygonMarkerGroup.on({
        click: function (e) {
            //when click first point
            if (polygonLatLngs[0] == e.latlng) {
                map.fitBounds(polygon.getBounds(), { maxZoom: 13 });
                //finish drawing polygon
                polygonMarkerGroup.removeFrom(map);
                polygon._resizePoint = polygon.getLatLngs()[0]
                polygon._centerPoint = polygon.getCenter()
                polygonMarkerGroup.off('click')
                map.off("click");
            }
        },
    });
}

function makeMarker(latlng, icon) {
    var marker;
    if (icon) {
        marker = L.marker(latlng, { icon: icon, draggable: true });
        marker
        // .bindTooltip(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`)
    } else {
        marker = L.marker(latlng);
        // marker.bindTooltip(`${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`)
    }
    marker._shape = "marker";
    return marker;
}

function makeCircle(latlng) {
    var options = {
        color: "red",
        fillColor: "#f03",
        fillOpacity: 0.5,
    };
    var circle = L.circle(latlng, options);
    circle._shape = "circle";
    return circle;
}

function makeRectangle(bounds) {
    var options = { color: "#ff7800", weight: 1 };
    var rectangle = L.rectangle(bounds, options);
    rectangle._shape = "rectangle";
    return rectangle;
}

function makePolyline(latlngs = []) {
    var options = {
        color: "red",
        weight: 4,
    };
    var polyline = L.polyline(latlngs, options);
    polyline._shape = 'polyline';
    return polyline;
}

function makePolygon(latlngs) {
    var options = {
        color: "blue",
        weight: 1,
    };
    var polygon = L.polygon(latlngs, options);
    //set attribute of shape
    polygon._shape = 'polygon'
    return polygon;
}