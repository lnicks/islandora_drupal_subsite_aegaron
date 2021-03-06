// namespace and application settings
var aegaron = 
{
	viewState: 		0, 		// 0 = single; 1 = dual
	zoomLevel: 		19,
	mapid1: 		'0012', // default mapid
	mapid2: 		'', 	//empty by default 
	mapCenter: 		[3660710.823399583, 2756502.4598684157], 
	alllayers_map1: 	[], // drop down array holder for all maps (map1)
	alllayers_map2: 	[],
	alllayers_map3: 	[],
	current_opacity: 	0.7,
	syncmaps: 		true,
	mosaicData: 		'',
	layer1: 		'',
	mapViewerHTMLFile: 	location.protocol + '//' + location.host + location.pathname,
	arcgisserverurl: 	'http://marinus.library.ucla.edu:6080/arcgis/rest/services/AEGARON/Georeferenced',
	satlayers: 		new ol.layer.Tile({
					mapid: 1,
					source: new ol.source.XYZ({
						url: 'http://whippet.ats.ucla.edu/arcgis/rest/services/aegaron_satellite/Philae/ImageServer/tile/{z}/{y}/{x}',
						maxZoom: 23
					}),
					visible: true
				})
};

// map options	
var map1,map2,map3;

// launch of document ready
$( document ).ready(function() {

	// set a default map id if not provided
	if(aegaron.getUrlVar('mapid1') !== '') { aegaron.mapid1 = aegaron.getUrlVar('mapid1')};
	if(aegaron.getUrlVar('mapid2') !== '') {
		// if url call includes a second map, popup a message window
		aegaron.mapid2 = aegaron.getUrlVar('mapid2');
		$('#loading').modal('show');
		setTimeout(function(){aegaron.dualView(1);$('#loading').modal('hide');},1500);
	};

	// add the satellite layer to each layer array
	aegaron.alllayers_map1.push(aegaron.satlayers);
	aegaron.alllayers_map2.push(aegaron.satlayers);
	aegaron.alllayers_map3.push(aegaron.satlayers);

	// initialize the map
	aegaron.getAllPlansFromMosaic();

	// add the transparency slider
	aegaron.transparencySlider();

	// resize (maximize) the window
	aegaron.resize();

});

//detect when window has been resized
$( window ).resize(function() {
	aegaron.resize();
});

//resize the map when window size changes
aegaron.resize = function()
{
	var height = $(window).height()-80;
	$('#mapcontainer1-map').css('height',height);
	$('#mapcontainer2-map1').css('height',height);
	$('#mapcontainer2-map2').css('height',height);
	$('#map1').css('height',height);
	$('#map2').css('height',height);
	$('#map3').css('height',height);
	// map1.updateSize();

	if(map1){map1.updateSize();};
	if(map2){map2.updateSize();};
	if(map3){map3.updateSize();};
}

// Call ArcServer and get all the layers from the Mosaic Database
aegaron.getAllPlansFromMosaic = function()
{
	// url to arc server
	var url = aegaron.arcgisserverurl+'/ImageServer/query?where=1=1&outFields=*&returnGeometry=true&outSR=102100&f=pjson';

	// ajax call
	$.getJSON(url,function(data){
		aegaron.mosaicData = data.features;

		// loop through each mosaic
		$.each(data.features,function(i,item){

			// name is the Plan ID (eg: 0001, 0012, etc)
			var name = item.attributes.Name;

			// add to the drop down choices for all 3 map divs
			$("#changecompare1").append('<option value='+name+'>'+name+'</option>');
			$("#changecompare2").append('<option value='+name+'>'+name+'</option>');
			$("#changecompare3").append('<option value='+name+'>'+name+'</option>');
			// Note that the dropdowns are now displaying the planID.  We need a call
			// here to convert Plan ID to actual Plan title
		});

		// create map1 (single view)
		map1 = new ol.Map({
			target: 'map1',
			layers: aegaron.alllayers_map1,
			view: new ol.View({
				center: aegaron.mapCenter, 
				zoom: aegaron.zoomLevel
			})
		});

		// create map2 (left map for dual view)
		map2 = new ol.Map({
			target: 'map2',
			layers: aegaron.alllayers_map2,
			view: new ol.View({
				center: map1.getView().getCenter(),
				zoom: aegaron.zoomLevel
			})
		});

		// create map3 (right map for dual view)
		map3 = new ol.Map({
			target: 'map3',
			layers: aegaron.alllayers_map3,
			view: new ol.View({
				center: aegaron.mapCenter, 
				zoom: aegaron.zoomLevel
			})
		});

		// bind/sync the maps in dual view
		map2.bindTo('layergroup',map1);
		map2.bindTo('view',map1);
		map3.bindTo('view',map2);

		// set the drop down values
		$('#changecompare1').val(aegaron.mapid1);
		$('#changecompare2').val(aegaron.mapid1);
		$('#changecompare3').val(aegaron.mapid2);

		aegaron.switchCompareMap('map1');

		// ask for image to be redrawn every time map view changes
		map1.on('moveend', function(){aegaron.redrawOnMoveend()});
		map2.on('moveend', function(){aegaron.redrawOnMoveend()});
		map3.on('moveend', function(){aegaron.redrawOnMoveend()});
	})
}

aegaron.redrawOnMoveend = function()
{
	redrawLayer('map1');
	redrawLayer('map2');
	redrawLayer('map3');
}

// convert mapid's (ex '0011') to OJBECTID which is what arc needs to identify mosaic layer
aegaron.mapid2objectid = function(mapid)
{
	for (var i=0; i < aegaron.mosaicData.length; i++) 
	{
		if (aegaron.mosaicData[i].attributes.Name === mapid)
		{
			return aegaron.mosaicData[i].attributes.OBJECTID;
		}
	}
}

// get bounding box for given mapid
aegaron.getExtentByMapID = function(mapid)
{
	for (var i=0; i < aegaron.mosaicData.length; i++) 
	{
		if (aegaron.mosaicData[i].attributes.Name === mapid)
		{
			return new ol.extent.boundingExtent(aegaron.mosaicData[i].geometry.rings[0]);
		}
	}
}

// function to draw and redraw map(s) on request
function redrawLayer(mapdivid)
{
	// only redraw map2 and map3 if viewState = 1
	if(aegaron.viewState == 0 && mapdivid == 'map2') { return false; };
	if(aegaron.viewState == 0 && mapdivid == 'map3') { return false; };

	// putting mapdivid in a window[] array allows you to use a variable to call a global object
	// remove any existing overlays
	if(window[mapdivid].getLayers().getArray().length > 1)
	{
		window[mapdivid].removeLayer(window[mapdivid].getLayers().getArray()[1]);
	}

	// get the bounding box of current map
	var thisbbox = window[mapdivid].getView().calculateExtent(window[mapdivid].getSize());

	var polygon = [
		[
			[thisbbox[0],thisbbox[1]],
			[thisbbox[2],thisbbox[1]],
			[thisbbox[2],thisbbox[3]],
			[thisbbox[0],thisbbox[3]],
			[thisbbox[0],thisbbox[1]]
		]
	];

	// get the pixel size of the div
	// make sure to compensate for retina displays (window.devicePixelRatio)
	var thissize = [window[mapdivid].getSize()[0]*window.devicePixelRatio,window[mapdivid].getSize()[1]*window.devicePixelRatio];

	// set which map to get
	if(mapdivid == 'map1' || mapdivid == 'map2')
	{
		// get the objectID for this mapid
		var objectID = aegaron.mapid2objectid(aegaron.mapid1);
	}
	else
	{
		// get the objectID for this mapid
		var objectID = aegaron.mapid2objectid(aegaron.mapid2);
	}

	if(objectID!==undefined)
	{
		aegaron.layer1 = new ol.layer.Image({
			source: new ol.source.ImageMapGuide({
				url: aegaron.arcgisserverurl+'/ImageServer/exportImage?f=image&bbox='+thisbbox+'&imageSR=102100&bboxSR=102100&size='+thissize+'&mosaicRule={%22mosaicMethod%22:%22esriMosaicLockRaster%22,%22lockRasterIds%22:['+objectID+']}'
			}),
			extent: thisbbox
		})
		// add the image to the map as an overlay
		window[mapdivid].addLayer(aegaron.layer1);
		aegaron.layer1.setOpacity(aegaron.current_opacity);
	}
}

// toggle view modes (single/dual)
aegaron.dualView = function(view)
{
	if (view == 0)
	{
		$('#mapcontainer2').hide();
		$('#mapcontainer1').show();
		$('#sync-nav').hide();
		// $('#map-nav').show();
		map1.updateSize();
		aegaron.viewState = 0;

	}
	else if (view == 1)
	{
		$('#mapcontainer1').hide();
		$('#mapcontainer2').show();
		$('#changecompare2').val(aegaron.mapid1);
		$('#sync-nav').show();
		map2.updateSize();
		map3.updateSize();
		aegaron.resize();
		aegaron.viewState = 1;
	}
}

// toggle syncing of dual maps
aegaron.toggleSyncMaps = function()
{
	if(aegaron.syncmaps)
	{
		map3.unbindAll();
		var oldView = map3.getView();
		map3.setView(new ol.View({
			center: oldView.getCenter().slice(),
			resolution: oldView.getResolution(),
			rotation: oldView.getRotation()
		}));
		$('#sync-button-text').html('Sync maps')
		aegaron.syncmaps = false;
	}
	else
	{
		map3.bindTo('view',map2);
		$('#sync-button-text').html('Unsync maps')
		aegaron.syncmaps = true;
	}

}

// get URL parameters
aegaron.getUrlVar = function(key)
{
	var result = new RegExp(key + "=([^&]*)", "i").exec(window.location.search); 
	return result && unescape(result[1]) || ""; 
}

// set URL parameters
aegaron.setUrlVars=function(evt)
{
	var urlvars = aegaron.mapViewerHTMLFile+'?mapid1='+aegaron.mapid1+'&mapid2='+aegaron.mapid2+'&center='+map1.getView().getCenter()+'&zoom='+map1.getView().getZoom();
	history.pushState(null, "A new title!", urlvars);
}

// switch maps when new dropdown map chosen
aegaron.switchCompareMap=function(map)
{
	console.log('switching: '+map)
	if(map == 'map1')
	{
		var compareID = $('#changecompare1').val();
		aegaron.mapid1 = compareID;
		aegaron.setUrlVars();
		$('#changecompare2').val(compareID);

		// zoom to extent of new map
		var thisExtent = aegaron.getExtentByMapID(aegaron.mapid1);

		map1.getView().fitExtent(thisExtent,map1.getSize());

		redrawLayer('map1');
	}
	else if (map == 'map2')
	{
		var compareID = $('#changecompare2').val();
		aegaron.mapid1 = compareID;
		aegaron.setUrlVars();
		$('#changecompare1').val(compareID);

		// zoom to extent of new map
		var thisExtent = aegaron.getExtentByMapID(aegaron.mapid1);
		map1.getView().fitExtent(thisExtent,map1.getSize());
		map2.getView().fitExtent(thisExtent,map2.getSize());

		redrawLayer('map2');
	}
	else if (map == 'map3')
	{
		var compareID = $('#changecompare3').val();
		aegaron.mapid2 = compareID;
		aegaron.setUrlVars();
		// // zoom to extent of new map
		// var thisExtent = aegaron.getExtentByMapID(mapid1);
		// map1.getView().fitExtent(thisExtent,map1.getSize());

		redrawLayer('map3');
	}
}

// transparency slider for overlay
aegaron.transparencySlider = function()
{
	var handle = document.getElementById('handle2'),
		start,
		startLeft;

	document.onmousemove = function(e) {

		if (!start) return;
		// Adjust control
		handle.style.left = Math.max(0, Math.min(190, startLeft + parseInt(e.clientX, 10) - start)) + 40 + 'px';
		// Adjust opacity
		var opacity = 1 - ((handle.offsetLeft-40) / 190);

		aegaron.current_opacity = opacity;

		map1.getLayers().getArray()[1].setOpacity(opacity)
		map2.getLayers().getArray()[1].setOpacity(opacity)
		map3.getLayers().getArray()[1].setOpacity(opacity)
	}

	handle.onmousedown = function(e) {
		// Record initial positions
		start = parseInt(e.clientX, 0);
		startLeft = handle.offsetLeft - 40;
		return false;
	}

	document.onmouseup = function(e) {
		start = null;
	}
}

aegaron.setOpacityFromSliderButtons = function(val)
{
	console.log('opacity: ' + val)
	var this_opacity = aegaron.current_opacity + val;
	aegaron.setOpacity(this_opacity);	
}

aegaron.setOpacity = function(val)
{
	var this_opacity = val;
	if(this_opacity>=1){ this_opacity = 1};
	if(this_opacity<0){ this_opacity = 0};

	aegaron.current_opacity = this_opacity;
	// set the slider postion too
	var handleposition = 190-(this_opacity*190)+40+'px';
	console.log(handleposition);
	handle2.style.left=handleposition;

	map1.getLayers().getArray()[1].setOpacity(this_opacity)
	map2.getLayers().getArray()[1].setOpacity(this_opacity)
	map3.getLayers().getArray()[1].setOpacity(this_opacity)
}

