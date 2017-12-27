
// Create array of price block colors
var priceBlockColors = ["#9f2219", "#c97f33", "#e1b95c", "#90bb69", "#4b4285",
  "#b36f86", "#bab284", "#60c9df", "#8d8bc1", "#bae4d6"];

// Create tooltip for seat details
var seatDetails = d3.select("body").append("div")
    .attr("class", "seat-details")
    .style("opacity", 0)
    .style("display", "none")
    .on("mouseover", function() {
      seatDetails.style("display", "block").style("opacity", 1);
    })
    .on("mouseout", function() {
      seatDetails.style("opacity", 0).style("display", "none");
    });

// Create queue of load data
d3.queue()
  .defer(d3.json, "javascript/data/events.json")
  .defer(d3.json, "javascript/data/inventory/event-51761.json")
  .await(dataBinding);

function dataBinding(error, events, inventory) {
  if (error) { console.log(error); }

  // Store event ID
  var eventId = inventory.result.eventId;

  // Retrieve unique price block IDs from inventory data
  var priceBlockIds = inventory.result.seats.reduce(function(a, b) {
    if (!a.includes(b.priceLevelId)) { a.push(b.priceLevelId); }
    return a;
  }, []);

  // Map prices to price block IDs
  var priceBlocks = priceBlockIds.map(function(d) {
    var priceData = null;
    // Using event at index 7 from events array as example
    events.result[7].eventPromotions[0].priceBlocks.forEach(function(p) {
      if (d === p.priceLevelId) { priceData = p; }
    });
    return priceData;
  });

  // Sort based on price
  priceBlocks.sort(function(a, b) {
    if (a.fullPurchasePrice > b.fullPurchasePrice) { return -1; }
    else { return 1; }
  });

  // Add fill colors to price blocks
  priceBlocks = priceBlocks.map(function(data, index) {
    data.fillColor = priceBlockColors[index];
    return data;
  });

  // Create seats variable and add price block data to seats
  var seats = inventory.result.seats.map(function(data) {
    var seat = data;
    priceBlocks.forEach(function(priceBlock) {
      if (seat.priceLevelId === priceBlock.priceLevelId) {
        seat.priceData = priceBlock;
      }
      return seat;
    });
    return data;
  });

  // Append price blocks to chart legend
  var legend = d3.select("#legend");
  legend.selectAll("div")
    .data(priceBlocks)
    .enter()
    .append("div")
    .attr("class", "price-block")
    .html(function(data) {
      return '<span class="price-point">' +
        '<span class="fa fa-circle" style="color:' + data.fillColor + '"></span></span>' +
        '&emsp;&nbsp;$' + data.fullPurchasePrice;
    });

  // Append ADA button to chart legend
  var adaButton = legend.append("div")
    .attr("id", "ada-button")
    .html('<span class="fa fa-wheelchair-alt"></span>&ensp;&ensp;&ensp;Show accessible seating');

  // Bind data to chart
  var svg = d3.select("svg");
  svg.selectAll("circle")
    .attr("fill", "#eaeaea")
    .on("mouseover", function() { return; })
    .data(seats, function(seat) {
      return seat ? seat.key : this.id;
    })
    .attr("fill", function(seat) { return seat.priceData.fillColor; })
    .attr("class", "available")
    .on("mouseover", addToolTip)
    .on("mouseout", function(seat) {
      seatDetails.style("opacity", 0).style("display", "none");
    });

    // Allow user to toggle accessible seats
    var adaFiltered = false;
    adaButton.on("click", function() {
      var seatData = seats;
      if (!adaFiltered) {
        adaButton.html('<span class="fa fa-wheelchair-alt"></span>&ensp;&ensp;&ensp;Clear filter');
        svg.selectAll("circle")
        .attr("fill", "#eaeaea")
        .on("mouseover", function() { return; })
        .data(seatData, function(d) {
          return d ? d.key : this.id;
        })
        .filter(function(d) {
           if (d.adaType === "Accessible") { return d; }
         })
        .attr("fill", function(d) { return d.priceData.fillColor; })
        .attr("class", "available").on("mouseover", addToolTip)
        .on("mouseout", function(seat) {
          seatDetails.style("opacity", 0).style("display", "none");
        });
        adaFiltered = true;
      }
      else {
        adaButton.html('<span class="fa fa-wheelchair-alt"></span>&ensp;&ensp;&ensp;Show accessible seating');
        svg.selectAll("circle")
        .attr("fill", "#eaeaea")
        .on("mouseover", function() { return; })
        .data(seatData, function(d) {
          return d ? d.key : this.id;
        })
        .attr("fill", function(d) { return d.priceData.fillColor; })
        .attr("class", "available").on("mouseover", addToolTip)
        .on("mouseout", function(seat) {
          seatDetails.style("opacity", 0).style("display", "none");
        });
        adaFiltered = false;
      }
    });

    // Adds tooltip to selected circles
    function addToolTip(seat) {
      var seatData = seat;
      seatDetails.style("display", "block").style("opacity", 1)
        .html(function(seatData) {
          var location = seat.key.split("-");
          var ada = "";
          if (seat.adaType === "Accessible") { ada = "<span class=\"fa fa-wheelchair-alt ada-icon\"></span>"; }
          return "<div class=\"details-section\"><span class=\"section-label\">SECTION</span>" +
            "<span class=\"section-data\">" + location[0] + "</span></div>" +
            "<div class=\"details-section\"><span class=\"section-label\">ROW</span>" +
            "<span class=\"section-data\">" + location[1] + "</span></div>" +
            "<div class=\"details-section\"><span class=\"section-label\">SEAT</span>" +
            "<span class=\"section-data\">" + location[2] + "</span></div>" +
            "<span class=\"full-price\">$" + seat.priceData.fullPurchasePrice + ada + "</span>" +
            "<span class=\"price-breakdown\">Ticket Price: $" + seat.priceData.purchasePrice + "</span>" +
            "<span class=\"price-breakdown\">Purchase Fees: $" + seat.priceData.purchaseFeeTotal + "</span>" +
            "<div class=\"button-wrapper\"><span class=\"buy-now\">BUY NOW</span></div>";
        })
        .on("click", function() {
          window.open("https://nliven.cirquedusoleil.com/tickets/series/ONE/michael-jackson-one-"+eventId+"#mapView");
        })
        .style("left", function() {
            var x = (d3.event.pageX < 1203) ? d3.event.pageX - 105 + "px" : "1098px";
            return x;
        })
        .style("top", function() {
            var y = (d3.event.pageY - 195 > 1) ? d3.event.pageY - 195 + "px" : "1px";
            return y;
        });
    }
}
