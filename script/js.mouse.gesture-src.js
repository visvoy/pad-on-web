/*
 * Native mouse gesture
 * version 1.0
 */
(function(window, document){
var gestureX = 0,
    gestureY = 0,
	eventStartX = 0,
	eventStartY = 0,
	eventEndX = 0,
	eventEndY = 0,
	previousX = 0, // Advanced Tracking
	previousY = 0, // Advanced Tracking
	underEvent = false,
    // trailTimer = null,
	shapeTimer = null,
	eventTimer = null,
    startHandler = [],
    captureHandler = [],
    trackingDot = [],
    trackingLine = [],
    directionArray,
    
    enabled = true,
    
    ie = !!window.ActiveXObject,
    
    config = {
        // Used to apply class names to the elements created by the plugin. 
        // You only need to specify a class modifier if you have a name-clash.
		prefix: "gesture",
        
        // The amount of movement to ignore (default 25)
		tolerance: 25,
        
        // Track for which mouse button? "left" or "right" or "middle" (default "left")
        mouseButton: 'left',
        
        // The event to start the gesture tracking (default "mousedown")
		startEvent: "mousedown",
        
        // The event to end the gesture tracking (default "mouseup")
		endEvent: "mouseup",
        
        // The interval for gesture shape tracking (default 50)
		captureSpeed: 50,
        
        // Whether to show a trail while tracking (default false)
		showTrail: false,
        
        // Trail line color
        trailColor: '#00cc00',
        
        // Time limit for each event (default 5000)
		eventLimit: 5000
    };
    

// Get element [k] DOM object
function e(k) {
	return (typeof k == 'string') ? document.getElementById(k) : k;
}

// Get element name DOM objects from DOM ob
function en(k, ob) {
	return e(ob || document).getElementsByName(k);
}

// Get element tag name DOM objects from DOM ob
function et(k, ob) {
	return e(ob || document).getElementsByTagName(k);
}

// Get first document.body
function getBody() {
    var ob = et('body');
    if (typeof ob == 'object' && typeof ob[0] == 'object') {
        return ob[0];
    }
    console.log('document.body not exist!');
    return false;
}

// Attach multiple events on a DOM
function addEvent(ob, eventName, handler) {
    if (ob.addEventListener) { // DOM standard
        ob.addEventListener(eventName, handler, false);
    } else if (ob.attachEvent) { // IE
        ob.attachEvent('on' + eventName, handler);
    }    
}

// Draw a line
function drawLine(container, x0, y0, x1, y1, color) {
    if (typeof container != 'object') return;
    
    var i, p, px, py, dot,
        rs = [],
        lx = x1 - x0,
        ly = y1 - y0,
        l = Math.sqrt(lx * lx + ly * ly);
    
    for (i = 0; i < l; i++) {
        p = i / l; 
        px = parseInt(x0 + lx * p);
        py = parseInt(y0 + ly * p);
        dot = document.createElement('div');
        dot.id = config.prefix + 'motionline' + Math.random();
        dot.onselectstart = function(){return false};
        dot.style.cssText = "top:"+py+"px;left:"+px+"px;position:absolute;z-index:999999;width:2px;height:2px;font-size:2px;background-color:"+color+";-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-o-user-select:none;user-select:none";
        container.appendChild(dot);
        trackingLine.push(dot.id);
    }
}

// Determines the compass direction from a gesture
function getCompass(sx, sy, ex, ey) {
	var eventName = "nil",
        horizontalMovement = ex - sx,
        verticalMovement = sy - ey;

	// Discard horizontal movements below the tolerance threshold
	if (horizontalMovement < config.tolerance && horizontalMovement > (config.tolerance * -1)) {
		horizontalMovement = 0;
	}

	// Discard vertical movements below the tolerance threshold
	if (verticalMovement < config.tolerance && verticalMovement > (config.tolerance * -1)) {
		verticalMovement = 0;
	}
	
	// For a diagonal move, horizontal should be within 50% of vertical otherwise we assume not diagonal
	if (horizontalMovement != 0 && verticalMovement != 0) {
		var h = horizontalMovement;
		var v = verticalMovement;
		// Use positive numbers for calculations
		if (h < 0) {
			h = h * -1;
		}
		if (v < 0) {
			v = v * -1;
		}
		// Check "diagonality" - if it isn't diagonal enough, make it flat
		if (h > v) {
			if (v < (h * 0.5)) {
				verticalMovement = 0;
			}
		} else {
			if (h < (v * 0.5)) {
				horizontalMovement = 0;
			}
		}
	}
	
	// Adjustments are all made... lets get the event...
	if (horizontalMovement != 0 && verticalMovement != 0) {
		if (horizontalMovement > 0) {
			if (verticalMovement > 0) {
				eventName = "NE";
			} else {
				eventName = "SE";
			}
		} else {
			if (verticalMovement > 0) {
				eventName = "NW";
			} else {
				eventName = "SW";
			}
		}
	} else if (horizontalMovement != 0) {
		if (horizontalMovement > 0) {
			eventName = "E";
		} else {
			eventName = "W";
		}
	} else if (verticalMovement != 0) {
		if (verticalMovement > 0) {
			eventName = "N";
		} else {
			eventName = "S";
		}
	}

	return eventName;
}

// Clear trail lines
function clearTrailLine(lines) {
    var id, lineClone = [];
    for (id in lines) {
        lineClone[id] = lines[id];
    }
    window.setTimeout(function(){
        while (id = lineClone.pop()) {
            if (id = e(id)) {
                id.parentNode.removeChild(id);
            }
        }
    }, 680);
}

// Advance grsture tracking
function trackDirections() {
	if ( ! underEvent) return;
	var xLength = gestureX - previousX;
	var yLength = gestureY - previousY;
	
	if (xLength < 0) {
		xLength = xLength * -1;
	}
	
	if (yLength < 0) {
		yLength = yLength * -1;
	}

	// If the lengths are over the ignorable tolerance
	if (xLength > config.tolerance || yLength > config.tolerance) {
		var direction = getCompass(previousX, previousY, gestureX, gestureY);
		if (direction != "nil") {
            drawLine(getBody(), previousX, previousY, gestureX, gestureY, config.trailColor);
			previousX = gestureX;
			previousY = gestureY;
			if (directionArray.length == 0) {
				directionArray[directionArray.length] = { d: direction, x: xLength, y: yLength };
			} else{
				if (direction != directionArray[directionArray.length - 1].d) {
					directionArray[directionArray.length] = { d: direction, x: xLength, y: yLength };
				} else {
					directionArray[directionArray.length - 1].x += xLength;
					directionArray[directionArray.length - 1].y += yLength;
				}
			}
		}
	}
	
	shapeTimer = window.setTimeout(trackDirections, config.captureSpeed);
}

// Starts tracking
function startTracking(evt) {
	if ( ! enabled || underEvent) return;

    // find matched mouse button
    var clickButton = 0, 
        mapButton = (ie ? {1: "left", 2: "right", 4: "middle"} : {0: "left", 2: "right", 1: "middle"});
    if (typeof evt.button != 'undefined') {
        clickButton = evt.button;
    }
    if (typeof mapButton[clickButton] == "undefined" || mapButton[clickButton] != config.mouseButton) {
        return;
    }
    
	underEvent = true;
	eventStartX = gestureX;
	eventStartY = gestureY;
	// In case the mouse up event is lost, this will force the stop event
	eventTimer = window.setTimeout(endTracking, config.eventLimit);
    
    for (var i = 0; i < startHandler.length; i++) {
        startHandler[i](eventStartX, eventStartY);
    }
    
	previousX = gestureX;
	previousY = gestureY;
	directionArray = new Array();
	trackDirections();
}

// Ends tracking
function endTracking(evt) {
	window.clearTimeout(eventTimer);
	if ( ! underEvent) return;
	underEvent = false;
	eventEndX = gestureX;
	eventEndY = gestureY;

    for (var i = 0; i < captureHandler.length; i++) {
        captureHandler[i](directionArray);
    }

	// Track Mouse Trail
	if (config.showTrail) {
		clearTrailLine(trackingLine);
	}
}

var fn = {
    
    // Gesture setting
    config: function(key, value) {
        if (typeof key == 'undefined') {
            return config;
        }
        if (typeof key != 'object') {
            var k = {};
            k[key] = value;
            key = k;
        }
        for (var k in key) {
            if (k == 'didStartCapture') {
                fn.didStartCapture(key[k]);
                continue;
            }
            if (k == 'didCaptureGesture') {
                fn.didCaptureGesture(key[k]);
                continue;
            }
            config[k] = key[k];
        }
    },
    
    // Called when starting capturing a gesture
    didStartCapture: function(handler) {
        startHandler.push(handler);
    },
    
    // Called when captured a gesture
    didCaptureGesture: function(handler) {
        captureHandler.push(handler);
    },

    // Enable or disable mouse capture
    enable: function(setEnabled) {
        enabled = (setEnabled ? true : false);
    },
    
    // Check mouse capture enabled or disabled
    enabled: function() {
        return enabled;
    },
    
    // Gesture init
    init: function(configObject) {
        if (typeof configObject == 'object') {
            fn.config(configObject);
        }
        
        addEvent(document, 'mousemove', function(evt) {
            if (evt.pageX || evt.pageY) {
        		gestureX = parseInt(evt.pageX, 10);
        		gestureY = parseInt(evt.pageY, 10);
            } else if (evt.clientX || evt.clientY) {
        		gestureX = evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        		gestureY = evt.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }
    	});
        
        addEvent(document, config.startEvent, function(evt) {
            startTracking(evt);
            return false;
        });
        addEvent(document, config.endEvent, function(evt) {
            endTracking(evt);
            return false;
        });
    }
};

// Publish
if ( ! window.js) window.js = {};
if ( ! window.js.mouse) window.js.mouse = {};
if ( ! window.js.mouse.gesture) window.js.mouse.gesture = fn;
})(window,document);