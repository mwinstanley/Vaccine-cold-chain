var map;
var markers = [];
var infoWindow;
var selections = [];
var considerPop = true;

// INDICES - FACILITIES
var i_facility_code = 0;
var i_admin_code = 1;
var i_level2 = 2;
var i_level3 = 3;
var i_level4 = 4;
var i_level5 = 5;
var i_facility_type = 6;
var i_gis_code = 7;
var i_facility_name = 8;
var i_total_pop = 11;
var i_electricity = 18;
var i_kerosene = 19;
var i_bottled_gas = 20;
var i_solar = 21;
var i_latitude = 45;
var i_longitude = 46;
var i_stock_outs = 56;
var i_surplus = 60;
var i_requirements = 61;

// INDICES - VACCINE BASE
var ib_facility_code = 0;
var ib_actual = 4;
var ib_required = 5;
var ib_surplusHi = 7;
var ib_surplusLo = 8;
var ib_match = 9;
var ib_shortageLo = 10;
var ib_shortageHi = 11;

// INDICES - INV_REF
var ir_facility_code = 1;
var ir_item_type = 2;
var ir_library_id = 3;
var ir_model_name = 4;
var ir_energy = 7;
var ir_net_capacity = 14;

var categories = [];

var electricityCodes = [['None', 'images/red.png'],
                        ['Under 8 hours / day', 'images/orange.png'],
                        ['8-16 hours / day', 'images/yellow.png'],
                        ['Over 16 hours / day', 'images/green.png']];
var keroseneCodes = [['N/A', null],
                     ['Always Available', 'images/green.png'],
                     ['Sometimes Available', 'images/yellow.png'],
                     ['Not Available', 'images/red.png'],
                     ['Unknown', 'images/white.png']];
var gasCodes = [['N/A', null],
                ['Always Available', 'images/green.png'],
                ['Sometimes Available', 'images/yellow.png'],
                ['Not Available', 'images/red.png'],
                ['Unknown', 'images/white.png']];
var stockOutCodes = [['No', 'images/green.png'],
                     ['Yes', 'images/red.png']];
var surplusCodes = [['Over 30% surplus', 'images/green.png'],
                    ['10-30% surplus', 'images/blue.png'],
                    ['+- 10%', 'images/white.png'],
                    ['10-30% shortage', 'images/yellow.png'],
                    ['Over 30% shortage', 'images/red.png']];
var schedules = ['base',
		 'pcv',
		 'rota'];

var facilityTypeCodes = ['N/A',
                         'National vaccine store',
                         'Regional vaccine store',
                         'District vaccine store',
                         'District hospital - MoH',
                         'Central hospital - MoH',
                         'Rural hospital - MoH',
                         'Hospital - CHAM',
                         'Community hospital - CHAM',
                         'Hospital - private',
                         'Health centre - MoH',
                         'Health centre - CHAM',
                         'Health centre - private',
                         'Maternity - local government',
                         'Maternity - MoH',
                         'Dispensary - local government',
                         'Dispensary - MoH',
                         'Health post - MoH'];

/*
 * Set up the initial map.
 */
$(document).ready(function(){
    var latlng = new google.maps.LatLng(-13.15, 34.4);
    var myOptions = {
        zoom: 7,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var mapDiv = document.getElementById('map-canvas');
    map = new google.maps.Map(mapDiv, myOptions);
    
    categories['electricity'] = i_electricity;
    categories['gas'] = i_bottled_gas;
    categories['kerosene'] = i_kerosene;
    categories['stock-outs'] = i_stock_outs;
    categories['surplus'] = i_surplus;
    categories['pie-chart'] = -1;
    $('#selector').change(function() {
        showCategory(categories[$('#selector').val()]);
        showKey(categories[$('#selector').val()]);
    });
    selections.category = i_electricity;
    
    var types = [];
    types['all'] = null;
    types['national-regional'] = [1,2];
    types['district'] = [3];
    types['health-center'] = [10,11];
    types['health-post'] = [16,17];
    types['other'] = [4,5,6,7,8,9,12,13,14,15];
    $('#facility-type').change(function() {
        showTypes(types[$('#facility-type').val()]); 
    });
    
    var regions = [];
    regions['north'] = 'NORTH';
    regions['central'] = 'CENTRAL';
    regions['south'] = 'SOUTH';
    regions['all'] = null;
    $('#region').change(function() {
        showOneRegion(regions[$('#region').val()]); 
    });
    
    $('#ignore-size').click(function() {
        if (considerPop) {
            $('#ignore-size').html('Consider population');
        } else {
            $('#ignore-size').html('Ignore population');
        }
        considerPop = !considerPop;
        showCategory(selections.category);
    });

    var schedule = [];
    schedule['base'] = 'VaccineVolume_Base.csv';
    schedule['pcv'] = 'VaccineVolume_PCV.csv';
    schedule['rota'] = 'VaccineVolume_Rota.csv';
    $('#schedule').change(function() {
	showSchedule($('#schedule').val());
    });
    var index = 0;
    for (sched in schedule) {
	schedule[index] = readFile(schedule[sched]).split(/\n/g);
	index++;
    }
    selections.schedule = 'base';
    
    infoWindow = new google.maps.InfoWindow({
        content: "hi there!"
    });
    
    google.maps.event.addListener(map, 'zoom_changed', function() {
        showCategory(selections.category);
    });
    
    var points = readFile('TBL_FACILITIES.csv').split(/\n/g);
    var fridgeData = readFile('TBL_INV_REF.csv').split(/\n/g);
    var vaccine_index = 1;
    var fridge_index = 1;
    var nextFridge = fridgeData[fridge_index].split(/,/g);
    for (var i = 1; i < points.length; i++) {
        var id = processLocMalawi(points[i]);
        while (nextFridge != '' && nextFridge[ir_facility_code] == id) {
            processFridge(nextFridge, i - 1);
            fridge_index = fridge_index + 1;
            nextFridge = fridgeData[fridge_index].split(/,/g);
        }
        if (schedule[0][vaccine_index] && schedule[0][vaccine_index].split(/,/g)[0] == id) {
	    var vals = [];
	    for (j = 0; j < 3; j++) {
		vals[j] = schedule[j][vaccine_index].split(/,/g);
	    }
            processVaccine(vals, i - 1);
            vaccine_index++;
        }
    }
    showCategory(i_electricity);
    $('#selector').val('electricity');
    $('#region').val('all');
    $('#facility-type').val('all');
    $('#schedule').val('base');
    resize();
});

function showCategory(category) {
    selections.category = category;
    if (markers) {
        for (m in markers) {
            var marker = markers[m];
	    var thisMap = marker.getMap();
            if (category < 0) {
                setPie(marker);
            } else {
		if (category == i_surplus) {
		    setImage(marker, marker.info[category], category);
		} else {
		    setImage(marker, parseInt(marker.info[category]), category);
		}
            }
	    marker.setMap(thisMap);
        }
    }
    showKey(category);
}

function showRegion(regions) {
    selections.regions = regions;
    if (markers) {
        for (m in markers) {
            var marker = markers[m];
            if ((regions == null || regions.length == 0 || marker.info[i_level2] in regions)
                && (selections.facilityTypes == null || selections.facilityTypes.length == 0 ||
                    marker.info[i_facility_type] in selections.facilityTypes)) {
                marker.setMap(map);
            } else {
                marker.setMap(null);
            }
        }
    }
}

function showOneRegion(region) {
    selections.regions = region;
    if (markers) {
        for (m in markers) {
            var marker = markers[m];
            if ((region == null || marker.info[i_level2] == region)
                && (selections.facilityTypes == null || selections.facilityTypes.length == 0 ||
                        marker.info[i_facility_type] in selections.facilityTypes)) {
                marker.setMap(map);
            } else {
                marker.setMap(null);
            }
        }
    }
}

function showTypes(intTypes) {
    types = [];
    for (i in intTypes) {
        types[intTypes[i]] = true;
        types.length++;
    }
    selections.facilityTypes = types;
    if (markers) {
        for (m in markers) {
            var marker = markers[m];
            if ((types == null || types.length == 0 || marker.info[i_facility_type] in types)
                 && (selections.regions == null || selections.regions.length == 0 || marker.info[i_level2] == selections.regions)) {
                marker.setMap(map);
            } else {
                marker.setMap(null);
            }
        }
    }
}

function showSchedule(schedule) {
    selections.schedule = schedule;
    if (selections.category == i_surplus || selections.category < 0) {
	showCategory(selections.category);
    }
}

// ------------------ KEY ----------------------------------------
function showKey(type) {
    var panelText = '';
    var green = '<img src="images/green.png" width="15px" height="15px"/>';
    var orange = '<img src="images/orange.png" width="15px" height="15px"/>';
    var red = '<img src="images/red.png" width="15px" height="15px"/>';
    var yellow = '<img src="images/yellow.png" width="15px" height="15px"/>';
    var white = '<img src="images/white.png" width="15px" height="15px"/>';
    var blue = '<img src="images/blue.png" width="15px" height="15px"/>';
    if (type == i_kerosene) {
        panelText = '<table><tr><td>(KEY) Kerosene:</td><td>' + green + ' ' + keroseneCodes[1][0] + '</td><td>'
                              + yellow + ' ' + keroseneCodes[2][0] + '</td><td>'
                              + red + ' ' + keroseneCodes[3][0] + '</td><td>'
                              + white + ' ' + keroseneCodes[4][0] + '</td></tr></table>';
    } else if (type == i_bottled_gas) {
        panelText = '<table><tr><td>(KEY) Gas:</td><td>' + green + ' ' + gasCodes[1][0] + '</td><td>'
                               + yellow + ' ' + gasCodes[2][0] + '</td><td>'
                               + red + ' ' + gasCodes[3][0] + '</td><td>'
                               + white + ' ' + gasCodes[4][0] + '</td></tr></table>';
    } else if (type == i_electricity) {
        panelText = '<table><tr><td>(KEY) Electricity:</td><td>' + red + ' ' + electricityCodes[0][0] +'</td><td>'
                                  + orange + ' ' + electricityCodes[1][0] + '</td><td>'
                                  + yellow + ' ' + electricityCodes[2][0] + '</td><td>'
                                  + green + ' ' + electricityCodes[3][0] + '</td></tr></table>';
    } else if (type == i_stock_outs) {
        panelText = '<table><tr><td>(KEY) Stock-outs:</td><td>' + green + ' No</td><td>' + red + ' Yes</td></tr></table>';
    } else if (type == i_surplus) {
        panelText = '<table><tr><td>(KEY) Base Vaccine Surplus:</td><td>'
                        + green + ' ' + surplusCodes[0][0] + '</td><td>'
                        + blue + ' ' + surplusCodes[1][0] + '</td><td>'
                        + white + ' ' + surplusCodes[2][0] + '</td><td>'
                        + yellow + ' ' + surplusCodes[3][0] + '</td><td>'
                        + red + ' ' + surplusCodes[4][0] + '</td></tr></table>';
    } else if (type == -1) {
        panelText = '<table><tr><td>(KEY) Vaccine Requirements:</td><td>'
            + '<img src="images/green_0_100_0.png" width="20px" height="20px"/> >8hrs electricity</td><td>'
            + '<img src="images/blue_0_100_0.png" width="20px" height="20px"/> <8hrs electricity, gas</td><td>'
            + '<img src="images/black_0_100_0.png" width="20px" height="20px"/> <8hrs electricity, kerosene</td><td>'
            + '<img src="images/red_0_100_0.png" width="20px" height="20px"/> None of the above</td><td>'
            + '</td><td></td><td>'
            + '<img src="images/green_100_0_0.png" width="20px" height="20px"/> Requirements fully met</td><td>'
            + '<img src="images/green_0_100_0.png" width="20px" height="20px"/> Requirements fully unmet</td></tr></table>';
    } else {
        panelText = 'Whoops!';
    }
    
    $('#footer').html(panelText);
}

// ------------------ MARKERS ------------------------------------
/*
 * Set the image of the given marker to represent the given category's value.
 */
function addMarker(location, data) {
    markers.push(makeMarker(location, data));
}

function makeMarker(location, info) {
    var marker = new google.maps.Marker({
            position: location,
            map: map
    });
    marker.info = info;
    
    setImage(marker, parseInt(info[i_electricity]), i_electricity);
    
    var listener = makeInfoBoxListener(marker);
    google.maps.event.addListener(marker, 'click', listener);
    //google.maps.event.addListener(marker, 'mouseover', listener);
    return marker;
}

function setImage(marker, value, category) {
    var imageName;
    if (category == i_electricity) {
        value = value >= 0 ? value : 0;
        imageName = electricityCodes[value][1];
    } else if (category == i_kerosene) {
        value = value >= 0 ? value : 4;
        imageName = keroseneCodes[value][1];
    } else if (category == i_bottled_gas) {
        value = value >= 0 ? value : 4;
        imageName = gasCodes[value][1];
    } else if (category == i_stock_outs) {
        value = value >= 0 ? value : 0;
        imageName = stockOutCodes[value][1];
    } else if (category == i_surplus) {
	if (!value) {
	    alert('value not defined, marker id=' + marker.info[i_facility_code]);
	}
	var val = value[selections.schedule];
        val = val >= 0 ? val : 2;
        imageName = surplusCodes[val][1];
    } else {
        imageName = 'white.png';
    }
    var zoom = map.getZoom();
    var factor = 40000 / (zoom / 7) / (zoom / 7) / (zoom / 7);
    var scale = marker.info[i_total_pop] / factor;
    if (!considerPop) {
        scale = (zoom - 7) * 3 + 6;
    } else if (marker.info[i_total_pop] < factor * ((zoom - 7) * 3 + 3)) {
        scale = (zoom - 7) * 3 + 3;
    } else if (marker.info[i_total_pop] > factor * ((zoom - 7) * 8 + 15)) {
        scale = (zoom - 7) * 8 + 15;
    }

    var image = new google.maps.MarkerImage(imageName,
              new google.maps.Size(scale, scale),
              // The origin for this image is 0,0.
              new google.maps.Point(0,0),
              new google.maps.Point(scale / 2, scale / 2),
              new google.maps.Size(scale, scale));
    marker.setIcon(image);
}

function setPie(marker) {
    var imageName = 'images/';
    var electricity = parseInt(marker.info[i_electricity]);
    var gas = parseInt(marker.info[i_bottled_gas]);
    var kerosene = parseInt(marker.info[i_kerosene]);
    if (electricity > 1) {
        imageName += 'green';
    } else if (gas == 1 || gas == 2) {
        imageName += 'blue';
    } else if (kerosene == 1 || kerosene == 2) {
        imageName += 'black';
    } else {
        imageName += 'red';
    }
    var reqs = marker.info[i_requirements];
    var reqsIndex = selections.schedule;
    if (reqs) {
	var perCapacity = reqs[reqsIndex][0] / reqs[reqsIndex][1];
        var percent = Math.floor(perCapacity * 10) / 10 * 100;
        if (perCapacity > 1) {
            percent = 100;
	    perCapacity = 1;
        }
	var fridges = marker.fridges;
	var total = 0;
	var elec = 0;
	if (fridges) {
	    for (f in fridges) {
		var nrg = fridges[f][2];
		var capacity = parseFloat(fridges[f][3]);
		if (nrg == 'E') {
		    elec += capacity;
		}
		total += capacity;
	    }
	}
	var red = 0;
	var green = 0;
	if (total == 0) {
	    green = percent;
	} else {
	    green = Math.floor(perCapacity * (elec / total) * 10) / 10 * 100;
	    if (green > 100) {
		alert('percapacity=' + perCapacity + ', elec=' + elec + ', total=' + total + ', reqs1=' + reqs[reqsIndex][0] + ', reqs2=' + reqs[reqsIndex][1]);
	    }
	    red = percent - green;
	}
	
    } else {
        percent = 0;
    }
    if (isNaN(percent)) {
	//alert('NaN, code=' + marker.info[i_facility_code] + ',' + reqs[reqsIndex][0] + ',' + reqs[reqsIndex][1]+','+marker.info);
	imageName += '_0_100_0.png';
    } else {
	// border_green_white_red.png
	imageName += '_' + Math.floor(green) + '_' + Math.floor(100 - percent) + '_' + Math.floor(red) + '.png';
    }
    var zoom = map.getZoom();
    var factor = 40000 / (zoom / 7) / (zoom / 7) / (zoom / 7);
    var scale = marker.info[i_total_pop] / factor;
    if (!considerPop) {
        scale = (zoom - 7) * 5 + 5;
    } else if (marker.info[i_total_pop] < factor * ((zoom - 7) * 5 + 5)) {
        scale = (zoom - 7) * 5 + 5;
    } else if (marker.info[i_total_pop] > factor * ((zoom - 7) * 10 + 20)) {
        scale = (zoom - 7) * 10 + 20;
    }
    
    var image = new google.maps.MarkerImage(imageName,
            new google.maps.Size(scale, scale),
            // The origin for this image is 0,0.
            new google.maps.Point(0,0),
            new google.maps.Point(scale / 2, scale / 2),
            new google.maps.Size(scale, scale));
  marker.setIcon(image);
}

function makeInfoBoxListener(marker) {
    return function() {
        var info = marker.info;
        var location = marker.position;
        var fridges = 'None';
        if (marker.fridges) {
            fridges = '';
            for (i in marker.fridges) {
                fridges += marker.fridges[i][0] + ",  ";
            }
            fridges = fridges.substring(0, fridges.length - 3);
        }
        var contentString = '<div id="popup-content">'+
            '<div id="siteDescription">' + info[i_facility_name] + '</div>' +
            '<table>' +
            '<tr><td>Facility type</td><td>' + facilityTypeCodes[parseInt(info[i_facility_type])] + '</td></tr>' +
            '<tr><td>Electricity level</td><td>' + electricityCodes[parseInt(info[i_electricity])][0] + '</td></tr>' +
            '<tr><td>Kerosene</td><td>' + keroseneCodes[parseInt(info[i_kerosene])][0] + '</td></tr>' +
            '<tr><td>Gas</td><td>' + gasCodes[parseInt(info[i_bottled_gas])][0] + '</td></tr>' +
            '<tr><td>Stock-outs</td><td>' + stockOutCodes[parseInt(info[i_stock_outs])][0] + '</td></tr>' +
            '<tr><td>Base Surplus</td><td>' + surplusCodes[parseInt(info[i_surplus]['base'])][0] + '</td></tr>' +
            '<tr><td>Population</td><td>' + info[i_total_pop] + '</td></tr>' +
            '<tr><td>Fridges</td><td>' + fridges + '</td></tr></table' +
            '</div>';
        infoWindow.content = contentString;
        infoWindow.open(map, marker);
    };
}

// -------------- PROCESS LOCATIONS ---------------------------------
function processLocMalawi(point) {
    if (point == '') {
        return;
    }
    var cells = point.split(/,/g);
    var latlong = parseUTM(cells[i_latitude], cells[i_longitude], 36, true);
    if (latlong) {
        addMarker(latlong, cells);
    }
    return cells[i_facility_code];
}

function readFile(U, V) {
    var X = !window.XMLHttpRequest ? new ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest();
    X.open(V ? "PUT" : "GET", U, false);
    X.setRequestHeader("Content-Type", "text/html");
    X.send(V ? V : "");
    return X.responseText;
}

//Copyright 1997-1998 by Charles L. Taylor
//http://home.hiwaay.net/~taylorc/toolbox/geography/geoutm.html
var pi = 3.14159265358979;

/* Ellipsoid model constants (actual values here are for WGS84) */
var sm_a = 6378137.0;
var sm_b = 6356752.314;
var sm_EccSquared = 6.69437999013e-03;

var UTMScaleFactor = 0.9996;


/*
* DegToRad
*
* Converts degrees to radians.
*
*/
function DegToRad (deg)
{
    return (deg / 180.0 * pi);
}




/*
* RadToDeg
*
* Converts radians to degrees.
*
*/
function RadToDeg (rad)
{
    return (rad / pi * 180.0);
}




/*
* ArcLengthOfMeridian
*
* Computes the ellipsoidal distance from the equator to a point at a
* given latitude.
*
* Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
* GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
*
* Inputs:
*     phi - Latitude of the point, in radians.
*
* Globals:
*     sm_a - Ellipsoid model major axis.
*     sm_b - Ellipsoid model minor axis.
*
* Returns:
*     The ellipsoidal distance of the point from the equator, in meters.
*
*/
function ArcLengthOfMeridian (phi)
{
    var alpha, beta, gamma, delta, epsilon, n;
    var result;

    /* Precalculate n */
    n = (sm_a - sm_b) / (sm_a + sm_b);

    /* Precalculate alpha */
    alpha = ((sm_a + sm_b) / 2.0)
       * (1.0 + (Math.pow (n, 2.0) / 4.0) + (Math.pow (n, 4.0) / 64.0));

    /* Precalculate beta */
    beta = (-3.0 * n / 2.0) + (9.0 * Math.pow (n, 3.0) / 16.0)
       + (-3.0 * Math.pow (n, 5.0) / 32.0);

    /* Precalculate gamma */
    gamma = (15.0 * Math.pow (n, 2.0) / 16.0)
        + (-15.0 * Math.pow (n, 4.0) / 32.0);

    /* Precalculate delta */
    delta = (-35.0 * Math.pow (n, 3.0) / 48.0)
        + (105.0 * Math.pow (n, 5.0) / 256.0);

    /* Precalculate epsilon */
    epsilon = (315.0 * Math.pow (n, 4.0) / 512.0);

/* Now calculate the sum of the series and return */
result = alpha
    * (phi + (beta * Math.sin (2.0 * phi))
        + (gamma * Math.sin (4.0 * phi))
        + (delta * Math.sin (6.0 * phi))
        + (epsilon * Math.sin (8.0 * phi)));

return result;
}



/*
* UTMCentralMeridian
*
* Determines the central meridian for the given UTM zone.
*
* Inputs:
*     zone - An integer value designating the UTM zone, range [1,60].
*
* Returns:
*   The central meridian for the given UTM zone, in radians, or zero
*   if the UTM zone parameter is outside the range [1,60].
*   Range of the central meridian is the radian equivalent of [-177,+177].
*
*/
function UTMCentralMeridian (zone)
{
    var cmeridian;

    cmeridian = DegToRad (-183.0 + (zone * 6.0));

    return cmeridian;
}



/*
* FootpointLatitude
*
* Computes the footpoint latitude for use in converting transverse
* Mercator coordinates to ellipsoidal coordinates.
*
* Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
*   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
*
* Inputs:
*   y - The UTM northing coordinate, in meters.
*
* Returns:
*   The footpoint latitude, in radians.
*
*/
function FootpointLatitude (y)
{
    var y_, alpha_, beta_, gamma_, delta_, epsilon_, n;
    var result;
    
    /* Precalculate n (Eq. 10.18) */
    n = (sm_a - sm_b) / (sm_a + sm_b);
        
    /* Precalculate alpha_ (Eq. 10.22) */
    /* (Same as alpha in Eq. 10.17) */
    alpha_ = ((sm_a + sm_b) / 2.0)
        * (1 + (Math.pow (n, 2.0) / 4) + (Math.pow (n, 4.0) / 64));
    
    /* Precalculate y_ (Eq. 10.23) */
    y_ = y / alpha_;
    
    /* Precalculate beta_ (Eq. 10.22) */
    beta_ = (3.0 * n / 2.0) + (-27.0 * Math.pow (n, 3.0) / 32.0)
        + (269.0 * Math.pow (n, 5.0) / 512.0);
    
    /* Precalculate gamma_ (Eq. 10.22) */
    gamma_ = (21.0 * Math.pow (n, 2.0) / 16.0)
        + (-55.0 * Math.pow (n, 4.0) / 32.0);
        
    /* Precalculate delta_ (Eq. 10.22) */
    delta_ = (151.0 * Math.pow (n, 3.0) / 96.0)
        + (-417.0 * Math.pow (n, 5.0) / 128.0);
        
    /* Precalculate epsilon_ (Eq. 10.22) */
    epsilon_ = (1097.0 * Math.pow (n, 4.0) / 512.0);
        
    /* Now calculate the sum of the series (Eq. 10.21) */
    result = y_ + (beta_ * Math.sin (2.0 * y_))
        + (gamma_ * Math.sin (4.0 * y_))
        + (delta_ * Math.sin (6.0 * y_))
        + (epsilon_ * Math.sin (8.0 * y_));
    
    return result;
}

/*
* MapXYToLatLon
*
* Converts x and y coordinates in the Transverse Mercator projection to
* a latitude/longitude pair.  Note that Transverse Mercator is not
* the same as UTM; a scale factor is required to convert between them.
*
* Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
*   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
*
* Inputs:
*   x - The easting of the point, in meters.
*   y - The northing of the point, in meters.
*   lambda0 - Longitude of the central meridian to be used, in radians.
*
* Outputs:
*   philambda - A 2-element containing the latitude and longitude
*               in radians.
*
* Returns:
*   The function does not return a value.
*
* Remarks:
*   The local variables Nf, nuf2, tf, and tf2 serve the same purpose as
*   N, nu2, t, and t2 in MapLatLonToXY, but they are computed with respect
*   to the footpoint latitude phif.
*
*   x1frac, x2frac, x2poly, x3poly, etc. are to enhance readability and
*   to optimize computations.
*
*/
function MapXYToLatLon (x, y, lambda0, philambda)
{
    var phif, Nf, Nfpow, nuf2, ep2, tf, tf2, tf4, cf;
    var x1frac, x2frac, x3frac, x4frac, x5frac, x6frac, x7frac, x8frac;
    var x2poly, x3poly, x4poly, x5poly, x6poly, x7poly, x8poly;
    
    /* Get the value of phif, the footpoint latitude. */
    phif = FootpointLatitude (y);
        
    /* Precalculate ep2 */
    ep2 = (Math.pow (sm_a, 2.0) - Math.pow (sm_b, 2.0))
          / Math.pow (sm_b, 2.0);
        
    /* Precalculate cos (phif) */
    cf = Math.cos (phif);
        
    /* Precalculate nuf2 */
    nuf2 = ep2 * Math.pow (cf, 2.0);
        
    /* Precalculate Nf and initialize Nfpow */
    Nf = Math.pow (sm_a, 2.0) / (sm_b * Math.sqrt (1 + nuf2));
    Nfpow = Nf;
        
    /* Precalculate tf */
    tf = Math.tan (phif);
    tf2 = tf * tf;
    tf4 = tf2 * tf2;
    
    /* Precalculate fractional coefficients for x**n in the equations
       below to simplify the expressions for latitude and longitude. */
    x1frac = 1.0 / (Nfpow * cf);
    
    Nfpow *= Nf;   /* now equals Nf**2) */
    x2frac = tf / (2.0 * Nfpow);
    
    Nfpow *= Nf;   /* now equals Nf**3) */
    x3frac = 1.0 / (6.0 * Nfpow * cf);
    
    Nfpow *= Nf;   /* now equals Nf**4) */
    x4frac = tf / (24.0 * Nfpow);
    
    Nfpow *= Nf;   /* now equals Nf**5) */
    x5frac = 1.0 / (120.0 * Nfpow * cf);
    
    Nfpow *= Nf;   /* now equals Nf**6) */
    x6frac = tf / (720.0 * Nfpow);
    
    Nfpow *= Nf;   /* now equals Nf**7) */
    x7frac = 1.0 / (5040.0 * Nfpow * cf);
    
    Nfpow *= Nf;   /* now equals Nf**8) */
    x8frac = tf / (40320.0 * Nfpow);
    
    /* Precalculate polynomial coefficients for x**n.
       -- x**1 does not have a polynomial coefficient. */
    x2poly = -1.0 - nuf2;
    
    x3poly = -1.0 - 2 * tf2 - nuf2;
    
    x4poly = 5.0 + 3.0 * tf2 + 6.0 * nuf2 - 6.0 * tf2 * nuf2
        - 3.0 * (nuf2 *nuf2) - 9.0 * tf2 * (nuf2 * nuf2);
    
    x5poly = 5.0 + 28.0 * tf2 + 24.0 * tf4 + 6.0 * nuf2 + 8.0 * tf2 * nuf2;
    
    x6poly = -61.0 - 90.0 * tf2 - 45.0 * tf4 - 107.0 * nuf2
        + 162.0 * tf2 * nuf2;
    
    x7poly = -61.0 - 662.0 * tf2 - 1320.0 * tf4 - 720.0 * (tf4 * tf2);
    
    x8poly = 1385.0 + 3633.0 * tf2 + 4095.0 * tf4 + 1575 * (tf4 * tf2);
        
    /* Calculate latitude */
    philambda[0] = phif + x2frac * x2poly * (x * x)
        + x4frac * x4poly * Math.pow (x, 4.0)
        + x6frac * x6poly * Math.pow (x, 6.0)
        + x8frac * x8poly * Math.pow (x, 8.0);
        
    /* Calculate longitude */
    philambda[1] = lambda0 + x1frac * x
        + x3frac * x3poly * Math.pow (x, 3.0)
        + x5frac * x5poly * Math.pow (x, 5.0)
        + x7frac * x7poly * Math.pow (x, 7.0);
        
    return;
}




/*
* LatLonToUTMXY
*
* Converts a latitude/longitude pair to x and y coordinates in the
* Universal Transverse Mercator projection.
*
* Inputs:
*   lat - Latitude of the point, in radians.
*   lon - Longitude of the point, in radians.
*   zone - UTM zone to be used for calculating values for x and y.
*          If zone is less than 1 or greater than 60, the routine
*          will determine the appropriate zone from the value of lon.
*
* Outputs:
*   xy - A 2-element array where the UTM x and y values will be stored.
*
* Returns:
*   The UTM zone used for calculating the values of x and y.
*
*/
function LatLonToUTMXY (lat, lon, zone, xy)
{
    MapLatLonToXY (lat, lon, UTMCentralMeridian (zone), xy);

    /* Adjust easting and northing for UTM system. */
    xy[0] = xy[0] * UTMScaleFactor + 500000.0;
    xy[1] = xy[1] * UTMScaleFactor;
    if (xy[1] < 0.0)
        xy[1] = xy[1] + 10000000.0;

    return zone;
}



/*
* UTMXYToLatLon
*
* Converts x and y coordinates in the Universal Transverse Mercator
* projection to a latitude/longitude pair.
*
* Inputs:
*   x - The easting of the point, in meters.
*   y - The northing of the point, in meters.
*   zone - The UTM zone in which the point lies.
*   southhemi - True if the point is in the southern hemisphere;
*               false otherwise.
*
* Outputs:
*   latlon - A 2-element array containing the latitude and
*            longitude of the point, in radians.
*
* Returns:
*   The function does not return a value.
*
*/
function UTMXYToLatLon (x, y, zone, southhemi, latlon)
{
    var cmeridian;
        
    x -= 500000.0;
    x /= UTMScaleFactor;
        
    /* If in southern hemisphere, adjust y accordingly. */
    if (southhemi)
    y -= 10000000.0;
            
    y /= UTMScaleFactor;
    
    cmeridian = UTMCentralMeridian (zone);
    MapXYToLatLon (x, y, cmeridian, latlon);
        
    return;
}

/*
* btnToGeographic_OnClick
*
* Called when the btnToGeographic button is clicked.
*
*/
function parseUTM(x, y, zone, southhemi)
{                                  
    latlon = new Array(2);
//        var x, y, zone, southhemi;
    
/**        if (isNaN (parseFloat (xa)) {
            alert ("Please enter a valid easting in the x field.");
            return null;
        }

        x = parseFloat (xa);

        if (isNaN (parseFloat (ya)) {
            alert ("Please enter a valid northing in the y field.");
            return null;
        }

        y = parseFloat (ya);

        if (isNaN (parseInt (36))) {
            alert ("Please enter a valid UTM zone in the zone field.");
            return null;
        }

        zone = parseFloat (36);

        if ((zone < 1) || (60 < zone)) {
            alert ("The UTM zone you entered is out of range.  " +
                   "Please enter a number in the range [1, 60].");
            return null;
        }
        
        if (south)
            southhemi = true;
        else
            southhemi = false;*/

    UTMXYToLatLon (x, y, zone, southhemi, latlon);


    return new google.maps.LatLng(RadToDeg (latlon[0]), RadToDeg (latlon[1]));
}

// ------------------- PROCESS FRIDGE DATA -------------
function processFridge(data, index) {
    if (markers[index].fridges == null) {
        markers[index].fridges = [];
    }
    var newFridge = [data[ir_model_name], data[ir_item_type], data[ir_energy], data[ir_net_capacity]];
    markers[index].fridges.push(newFridge);
}

function processVaccine(files, index) {
    var surpluses = [];
    var reqs = [];
    for (d in files) {
	var data = files[d];
	surpluses[schedules[d]] = ib_shortageHi - ib_surplusHi;
	for (var i = ib_surplusHi; i <= ib_shortageHi; i++) {
	    //alert(data[0] + ', i = ' + i);
	    if (data[i] == '1') {
		//alert('d = ' + d + ',' + schedules[d] + ',' + (i - ib_surplusHi));
		surpluses[schedules[d]] = i - ib_surplusHi;
		//alert(surpluses[schedules[d]]);
		break;
	    }
	}
	reqs[schedules[d]] = [data[ib_actual], data[ib_required]];
    }
    if (!surpluses) {
	alert(markers.info[i_facility_code]);
    }
    markers[index].info.push(surpluses);
    markers[index].info.push(reqs);
}

function computeHeight() {
    var content = $('#content').height();
    var header = $('#header').height();
    var footer = $('#footer').height();
    
    return Math.floor(content - header - footer);
}

function computeWidth() {
    var content = $('#content').width();
    var navBar = $('#nav-bar').width();
    
    return Math.floor(content - navBar);
}

function resize() {
    var height = computeHeight();
    var width = computeWidth();
    $('#map-canvas').height(computeHeight());
    $('#map-canvas').width(computeWidth());
    //$('#map-canvas').css('height', height + 'px');
    //$('#map-canvas').css('width', width + 'px');
}

$(window).resize(function() {
    resize();
});