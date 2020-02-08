



$(function () {
	function getClassifiedStyle(num) {

		var quantize = d3.scale.quantize();
		var range = quantize(num);
		var color;
		var style;
		
		switch (range) {
			default: {
				color = '#ffffff';
			}
		}
		style = {
			color: color,
			weight: 10,
			opacity: 0.6,
			fillOpacity: 0.65,
			fillColor: color
		};
		return style;
	}

	



	// Leaflet Map Init
	function initMap() {

		var map;
		map = L.map('map').fitWorld();

		// 使用Geolocation 定位寫法
		// map = L.map('map').fitWorld();

		// 特定定位點寫法
		// map = L.map('map').setView([25.0472453, 121.514101], 16);

		// 台北車站座標
		// .setView([25.0472453, 121.514101], 16)

		// 地圖資訊
		//cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png
		// https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
		var tiles = L.tileLayer('//cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
			attribution: '<a href="https://www.openstreetmap.org/" target="_blank">OSM</a>',
			maxZoom: 18
		}).addTo(map);
		
		
		var city_districts = {}
		var city_district_features = {}
		var ontained_features = []
		// 縣市區域分界
		$.getJSON('js/twCounty2010.geojson.json', function (data) {
			var geojson = L.geoJson(data, {
				onEachFeature: function (feature, layer) {
					// Set the default style into layer
					layer.setStyle(defaultStyle);

					// Set the highlight style into layer when 'mouseover'
					(function () {
						layer.on('mouseover', function () {
							// Set the style with classified color
							layer.setStyle(getClassifiedStyle(feature.properties));
						});
						layer.on('mouseout', function () {
							layer.setStyle(defaultStyle);
						});
					})(layer, feature.properties);
				}
			});
			geojson.addTo(map);

			//建立縣市下拉選單內容
			sorted_data = {features: []}
			Object.keys(data["features"]).sort().forEach(function (key) {
				sorted_data["features"][key] = data["features"][key];
			});

			for (i in sorted_data["features"]) {
				name = sorted_data["features"][i]["properties"]["name"]
				city_districts[name] = []
				city_district_features[name] = {}
				option = $("<option/>")
				option.text(name)
				$(".Country").append(option)
			}
			//設定縣市下拉選單行為
			$(".Country").on("change", function () {
				districts = city_districts[$(this).val()]
				$(".Country").val($(this).val())
				if (typeof districts != "undefined") {
					//切換縣市同時更換行政區
					dist_selecter = $(".Dist")
					dist_selecter.html("")
					if (districts.length != 0){
						for (i in districts) {
							district_option = $("<option/>")
							district_option.text(districts[i])
							dist_selecter.append(district_option)
						}
						dist_selecter.trigger("change")
					}else{
						district_option = $("<option/>")
						district_option.text("-")
						district_option.val("")
						dist_selecter.append(district_option)
					}

				}
			})

			$(".Dist").on("change", function () {
				country = $(".Country").val()
				store_features = city_district_features[country][$(this).val()]
				//取得該區地點們
				$(".ListBlock").html("")
				popup_exists = false
				for (var i in store_features){
					store = store_features[i]
					//用第一個地點移動畫面
					
					if (!popup_exists){
						if (store.properties.mask_adult + store.properties.mask_child > 0){
							auto_show_dict_store(store)
							popup_exists = true
						}
					}
					add_new_store(store)
				}
				if (!popup_exists && store_features.length > 0){
					auto_show_dict_store(store_features[0])
				}
			})

			
		});



		// 機構單位資訊
		var popup = L.popup({ minWidth: 180, maxWidth: 240, maxHeight: 300, className: 'NewPopup'});


		// styles
		var defaultStyle = {
			color: '#72bcd4',
			weight: 1,
			opacity: 1,
			fillOpacity: 0,
		};
		


		// Geolocation 定位 - 只能用https開啟
		map.locate({ setView: true});
		map.setView([25.0472453, 121.514101], 16);
		var get_locate_state = false;

		function onLocationFound(e) {
			var radius = e.accuracy;
			//L.marker(e.latlng).addTo(map)
				// 定位不準確 不顯示訊息
				// .bindPopup("You are within " + radius + " meters from this point").openPopup();
			var circle = L.circle(e.latlng, radius);
			circle.addTo(map);
			map.setView(e.latlng, 16);
			get_locate_state = true
		}
		map.on('locationfound', onLocationFound);

		function onLocationError(e) {
			console.log(e.message);
			map.setView([25.0472453, 121.514101], 16);
			get_locate_state = false
		}
		map.on('locationerror', onLocationError);
		

		// 全台機構資料
		store_layers = []
		$(".ListBlock").append("<h5>載入地圖範圍內有庫存的藥局中.....</h5>")
		$.getJSON('https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json', function (data) {
			
			$(".ListBlock").html("")
			// MarkerClusterGroup
			var markers = L.markerClusterGroup();
			var geoJsonLayer = L.geoJson(data, {
				onEachFeature: function (feature, layer) {
					//從地址產生縣市區域
					feature.properties.address = feature.properties.address.replace("桃園縣桃園市", "桃園市")
					addres_city_disc = feature.properties.address.match(/([^縣市]*[縣|市])([^區市鎮鄉]*[區|市|鄉|鎮])/)
					if (addres_city_disc != null){
						addres_city_disc[1] = addres_city_disc[1].replace(/^臺/, "台")
						if (addres_city_disc[1] == "為澎湖縣"){
							addres_city_disc[1] = "澎湖縣"
						}

						if ($.inArray(addres_city_disc[1], ["桃園縣", "高雄縣", "台南縣"]) != -1){
							addres_city_disc[1] = addres_city_disc[1].replace("縣", "市");
						}

						//整理有地點的行政區
						city_group = city_districts[addres_city_disc[1]]
						if (typeof addres_city_disc[2] != "undefined" && typeof addres_city_disc[1] != "undefined"){
							//分組地址
							addres_city_disc[2] = addres_city_disc[2].replace(/^臺/, "台")

							if ($.inArray(addres_city_disc[2], city_group) == -1) {
								latlng = feature.geometry.coordinates
								city_districts[addres_city_disc[1]].push(addres_city_disc[2])
								city_district_features[addres_city_disc[1]][addres_city_disc[2]] = []
							}
							city_district_features[addres_city_disc[1]][addres_city_disc[2]].push(feature)
						}
					}
					
					if (layer instanceof L.Marker && map.getBounds().contains(layer.getLatLng())) {
						if(feature.properties.mask_child + feature.properties.mask_adult > 0){
							add_new_store(feature)
							store_layers.push(layer)
						}
					}

					(function () {
						layer.on('click', function (e) {
							layer_popup(feature, e.latlng)
						});
					})(layer, feature.properties);


				}
			});
			markers.addLayer(geoJsonLayer);
			
			if (store_layers.length == 0){
				if (get_locate_state){
					$(".ListBlock").html("<h5>您附近沒有有庫存的地點, 請改用縣市區篩選</h5>")
				}else{
					$(".ListBlock").html("<h5>地圖範圍內沒有庫存的地點, 請改用縣市區篩選或授權本頁面您的位置資訊</h5>")
				}
			}
			map.addLayer(markers);
			//map.fitBounds(markers.getBounds());	
			
		})

		//共用 popup 機制
		function layer_popup(feature, latlng) {
			popup.setLatLng(latlng)
				.setContent("<div class='InfoTitle'>" + feature.properties.name + "</div>" +
					"<div class='Info'> <p>" + "<b>" +
					feature.properties.phone + "</b></br>" +
					feature.properties.address +
					"</p></div>" +
					"<div class='Note'>" + feature.properties.note + "</div>" +
					"<div class='Stock'> <div class='Item AdultMask'>成人口罩</br>" + "<div class='Quantity'>" + feature.properties.mask_adult + "</div></div>" +
					"<div class='Item ChildMask'>小孩口罩</br>" + "<div class='Quantity'>" + feature.properties.mask_child + "</div></div></div>" +

					"<div class='Info'>資料更新時間：" + feature.properties.updated + "</div>"
				).openOn(map)
		}

		//共用切換區域之後的自動 popup 行為
		function auto_show_dict_store(store) {
			latlng = [store.geometry.coordinates[1], store.geometry.coordinates[0]]
			layer_popup(store, latlng)
			map.setView(latlng, 18);
		}

		//建立藥局資料
		function add_new_store(store){
			latlng = [store.geometry.coordinates[1], store.geometry.coordinates[0]]
			if (store.properties.note == "") {
				store.properties.note = "無備註"
			}
			new_item = $('<a class="StoreItem">' +
				'<div class= "InfoTitle" > ' + store.properties.name + '</div >' +
				'<div class="Info"><p>' +
				'<b>' + store.properties.phone + '</b></br>' + store.properties.address +
				'</p></div >' +
				'<div class="Note">' + store.properties.note + '</div>' +
				'<div class="Stock">' +
				'<div class="Item AdultMask">成人口罩<br>' +
				'<div class="Quantity">' + store.properties.mask_adult + '</div>' +
				'</div>' +
				'<div class="Item ChildMask">小孩口罩<br>' +
				'<div class="Quantity">' + store.properties.mask_child + '</div></div></div>' +
				'<div class="Info">資料更新時間：' + store.properties.updated + '</div>' +
				'</a>')
			new_item.attr("data", JSON.stringify(store))
			new_item.on("click", function () {
				var store = JSON.parse($(this).attr("data"))
				var latlng = [store.geometry.coordinates[1], store.geometry.coordinates[0]]
				layer_popup(store, latlng)
			})
			$(".ListBlock").append(new_item)
		}

	}
	initMap();
	

	

	

	


});






