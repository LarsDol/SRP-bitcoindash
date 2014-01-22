(function (){
	/* Loader */
	// Stel een aantal variabelen in voor de history loader.
	var historyLoader = new HistoryLoader(pubnub, 'd5f06780-30a8-4a48-a2f8-7ed181b4a13f'),
		oneHour = 1000 * 60 * 60,
		startDate = ((Date.now() - oneHour * 24) * 10000),
		graphData = [],

		// Subscribe op de pubnub bitcoin stream.
		pubnub = PUBNUB.init({
			subscribe_key: 'sub-c-50d56e1e-2fd9-11e3-a041-02ee2ddab7fe'
		});

	// Maak een HistoryLoader constructor functie.
	function HistoryLoader(pubnub, channel) {
		this.pubnub = pubnub;
		this.channel = channel;
	}

	// Voeg loadHistory methode toe aan HistoryLoader,
	// deze functie maakt het mogelijk de prijzen tot een bepaald moment
	// in het verleden op te halen, met een tijdspanne er tussen.
	HistoryLoader.prototype.loadHistory = function(startDate, increment, callback) {
		var data = [], self = this;
		 
		function getHistory(history) {
			if (history.length === 1) {
				// Stop de nieuwe data in de data array.
				data.push(history[0]);
				// Verander de datum/tijd
				startDate += increment;
				// Haal de volgende waarde op
				self.getHistory(startDate, 1, getHistory);
			} else {
				// Als we alle benodigde data hebben, voer callback uit.
				callback(data);
			}
		}
		// Start de loop om data op te halen.
		this.getHistory(startDate, 1, getHistory);
	};

	// Haal de gemiddelde prijs op voor een opgegeven datum / tijd.
	HistoryLoader.prototype.getHistory = function(date, count, callback) {
		date *= 10000;
		pubnub.history({
			channel: this.channel,
			count: count,
			start: date,
			reverse: true,
			callback: function (history) {
				callback(history[0]);
			}
		});
	};

	// Voeg nieuwe data toe aan de al bestaande data.
	function addData(newData, oldData) {
		// Filter objecten met een gebugde date er uit.

		if ( oldData && oldData[oldData.length - 1].ticker.now < newData.ticker.now ) {
			// Convert eerst het binnen gehaalde object zodat we er iets mee kunnen.
			convertData(newData);

			// Push het object in de array met oude data.
			oldData.push(newData);
		} else {
			console.log( 'Bugged date found, filtering. - ', newData.ticker.now, '(new) vs', oldData[oldData.length - 1].ticker.now, '(old).' );
		}
	}

	/* Visualisatie */
	// Stel een aantal settings in.
	var valueX = 'date',
		valueY = 'value',
		margin = {top: 0, right: 20, bottom: 30, left: 50},
		width = 700 - margin.left - margin.right,
		height = 440 - margin.top - margin.bottom,
		dotRadius = 3,
		interpolationStyle = 'linear',
		extendFactorTop = 1.005,
		extendFactorBottom = 0.995,

		// Stel het format in waarmee dates gelezen moeten worden.
		parseDate = d3.time.format("%d-%b-%y").parse,

		// Geef een breedte en hoogte aan respectievelijk de x en de y as.
		x = d3.time.scale().range([0, width]),
		y = d3.scale.linear().range([height, 0]),

		// Maak een object aan voor verschillende lijnen
		// (zodat ze dynamisch gemaakt kunnen worden)
		pathCollection = {},

		// Maak een x as aan, en cache deze.
		xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom"),

		// Maak de y as aan, en cache deze.
		yAxis = d3.svg.axis()
			.scale(y)
			.orient("left"),

		// Maak een tooltip container aan, en cache deze.
		tooltip = d3.select("#graph").append("div")
			.attr("class", "tooltip"),

		// Maak een arrow box aan in de tooltip, en cache deze.
		arrow_box = d3.select(".tooltip").append("div")
			.attr("class", "arrow_box"),

		// Maak een SVG element aan om in te kunnen plotten.
		svg = d3.select("#graph").append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),

		// Initialiseer alvast de variabelen voor het achtergrond grid, x-as en y-as elementen.
		$grid, $xAxis, $yAxis;

	// Functie om extra x-assen te maken voor het grid op de achtergrond.
	function make_x_axis() {        
		return d3.svg.axis().scale(x).orient("bottom").ticks(8);
	}

	// Functie om de data te converteren naar iets waar we mee kunnen werken.
	function convertData(d) {
		d[valueX] = new Date(parseFloat(d.ticker.now / 1000));
		d[valueY] = +parseFloat(d.ticker.last.value);
	}

	// Functie die de graph intialiseert.
	function initGraph(data) {
		// Voeg de assen toe.
		addAxis(data);

		// Voeg grid lijnen toe aan de achtergrond.
		$grid = svg.append("g")         
			.attr("class", "grid")
			.attr("transform", "translate(0," + height + ")")
			.call(make_x_axis()
				.tickSize(-height, 0, 0)
				.tickFormat("")
			);

		// Voeg twee lijnen toe
		addPaths(data, [ 
			"path", 
			{ 
				name: "pathShadow", 
				correctionX: -0.001,
				correctionY: 0.005
			}
		]);

		// Voeg op ieder datapunt een cirkel toe.
		addDot(data);
	}

	// Functie om de graph de updaten.
	function updateGraph(data) {
		updateAxis(data);
		updatePaths(data);
		updateDots();
		addDot(data);
	}

	// Functie om lijnen dynamisch toe te voegen.
	function addPaths(data, paths) {
		var length = paths.length,
			correctionX, correctionY,
			i, pathName;

		// Loop door de paths array, en maak voor ieder pad in deze array
		// een lijn aan, en corrigeer het ten opzichte van de andere lijnen
		// als dat nodig is.
		for ( i = 0; i < length; i ++ ) {
			correctionX = 0; 
			correctionY = 0;

			// Check of het pad gedefinieerd is als string of als object.
			// Stel vervolgens de variabelen goed in.
			if ( typeof paths[i] === 'string' ) {
				pathName = paths[i];
			} else if ( typeof paths[i] === 'object' ) {
				pathName = paths[i].name;
				correctionX = paths[i].correctionX;
				correctionY = paths[i].correctionY;
			}

			// Als er nog geen lijn bestaat met dezelfde naam
			// voeg dan een lijn toe aan het pathCollection object.
			if ( !pathCollection[pathName] ) {
				pathCollection[pathName] = {
					pathData: pathData(correctionX, correctionY),
					$path: svg.append("path").attr("class", pathName)
				};
			}
		}

		// Functie om de data van een lijn binnen te halen en te corrigeren
		// op deze manier kan een lijn dienen als schaduw van een andere lijn.
		// De functie returned de data, welke gekoppeld wordt aan de lijn.
		function pathData(correctionX, correctionY) {
			var pData = d3.svg.line()
				.interpolate(interpolationStyle)
				.x(function(d) { 
					return x(d[valueX]) + ( x(d[valueX]) * correctionX);
				})
				.y(function(d) { 
					return y(d[valueY]) + ( y(d[valueY]) * correctionY); 
				});

			return pData;
		}

		// Update direct alle lijnen, zodat ze zichtbaar worden met de juiste data.
		updatePaths(data);
	}

	// Functie om lijnen te updaten
	function updatePaths(data, paths) {
		var hasOwn = Object.prototype.hasOwnProperty,
			pathName, $path;

		// Check of er specifieke lijnen zijn opgegeven in de paths array.
		if ( paths !== undefined ) {
			// Zo ja, update alleen die lijnen.
			// (Niet nodig in deze applicatie, dus nog niet gemaakt).
			console.log('Updating individual paths not supported yet.');
		} else {
			// Zo nee, update alle paden die in de pathCollection zitten.
			// Loop door alle properties in de pathCollection, en update het 'd' attribuut
			// op basis van de data van dat pad.
			for ( pathName in pathCollection ) if ( hasOwn.call(pathCollection, pathName) ) {
				$path = pathCollection[pathName].$path;
				$path.datum(data).attr("d", pathCollection[pathName].pathData);
			}
		}
	}

	// Functie om de x-as en y-as toe te voegen aan de graph.
	function addAxis(data) {
		$xAxis = svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")");
		$yAxis = svg.append("g")
			.attr("class", "y axis");

		updateAxis(data);
	}

	// Functie om de assen te updaten.
	function updateAxis(data) {
		// Stop de (nieuwe) maximum en minimum values van de data in variabelen.
		var maximum = d3.max(data.map(function(d) { return d[valueY] * extendFactorTop; })),
			minimum = d3.min(data.map(function(d) { return d[valueY] * extendFactorBottom; }));

		// Zorg er voor dat de domeinen van de assen geupdatet worden op basis van de nieuwe maxima en minima.
		x.domain(d3.extent(data, function(d) { return d[valueX]; }));
		y.domain(d3.extent([ minimum, maximum ]));

		// Roep de assen opnieuw aan.
		$yAxis.call(yAxis);
		$xAxis.call(xAxis);
	}

	// Functie om de punten op de lijn de updaten.
	function updateDots() {
		svg.selectAll("circle")
			.attr("cx", function (d) { return x(d[valueX]); })
			.attr("cy", function (d) { return y(d[valueY]); });
	}
	// Functie om een punt toe te voegen.
	function addDot(data) {
		svg.selectAll("dot")                  
			.data(data)                     
		.enter().append("circle")
			.attr('class', 'dataPoint')             
			.attr("r", dotRadius)
			.attr("cx", function(d) { return x(d[valueX]); })     
			.attr("cy", function(d) { return y(d[valueY]); })

		// Maak een hover effect voor de dot die toegevoegd is.
		// Zorg er voor dat de tooltip dynamisch op de goede plek gezet wordt,
		// fade deze vervolgens in of uit, en zet de juiste prijs en datum in de tooltip.
		.on("mouseover", function(d) {
			var boxWidth, boxHeight;

			arrow_box.html('$' + d[valueY] + '<br><span class="small">' + d[valueX] + '</span>');
			boxWidth = parseInt(arrow_box.style('width')) / 2;
			boxHeight = parseInt(arrow_box.style('height')) / 2;

			tooltip
				.style("left", (x(d[valueX]) - margin.left) + "px")
				.style("top", (y(d[valueY]) - boxHeight - 70) + "px")
				.transition()
				.duration(200)
				.style("opacity", 1);
		})                          // 
		.on("mouseout", function(d) {
			tooltip
				.transition()
				.duration(500)
				.style("opacity", 0);
		});
	}

	// Zorg er voor dat de hele applicatie start wanneer de pagina geladen is.
	$(document).ready(function () {

		// Begin met het laden van de history.
		historyLoader.loadHistory((Date.now() - 60000), 20000, function (data) {
			// Converteer alle data
			data.forEach(convertData);

			// Stop alle historische data in de graphData array.
			graphData = data;

			// Initialiseer de graph op basis van deze data.
			initGraph(graphData);

			// Subscribe op de pubnub stream, zodat we nieuwe data ontvangen.
			pubnub.subscribe({
				"channel" : "d5f06780-30a8-4a48-a2f8-7ed181b4a13f",
				"message" : function (message) {
					
				},
				// Callback wanneer we een nieuw prijs object ontvangen.
				callback: function(message) {
					$('#loader').fadeOut(500);
					$('#graph').animate({'opacity': 1}, 500, function(){
						// Voeg data toe aan de huidige graphData.
						addData(message, graphData);

						// Update de grafiek op basis van de nieuwe graphData.
						updateGraph(graphData);
					});

				}
			});
		});
	});

}());

// Functie om graph responsive te maken WIP.
/*$(window).resize(function (){
	width = $('#graph').parent().width() - margin.left - margin.right;
	x = d3.time.scale().range([0, width]);

	$('#graph svg').attr("width", width + margin.left + margin.right);
	

	updateGraph(graphData);
});*/