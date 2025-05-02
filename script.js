document.addEventListener('DOMContentLoaded', () => {
    const tooltip = d3.select('#tooltip'); // Use the shared tooltip
  
    // --- Function to create Combo Chart ---
    function createComboChart() {
        const container = d3.select("#combo-chart-container");
        const svgElement = container.select("#combo-chart-svg");
  
        // Get dimensions from container, subtract padding
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = 500; // Set a fixed height or calculate dynamically
        const margin = { top: 40, right: 60, bottom: 50, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
  
        svgElement.attr("width", containerWidth).attr("height", containerHeight);
        const svg = svgElement.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
  
        const inflationUrl = 'https://api.worldbank.org/v2/country/THA/indicator/FP.CPI.TOTL.ZG?date=2000:2023&format=json';
        const unemploymentUrl = 'https://api.worldbank.org/v2/country/THA/indicator/SL.UEM.TOTL.ZS?date=2000:2023&format=json';
  
        Promise.all([fetch(inflationUrl), fetch(unemploymentUrl)])
            .then(responses => Promise.all(responses.map(res => res.json())))
            .then(([inflationData, unemploymentData]) => {
                // Check if data is valid (World Bank API returns array, [0] is metadata, [1] is data)
                 if (!inflationData || !inflationData[1] || !unemploymentData || !unemploymentData[1]) {
                     console.error("Invalid data received from World Bank API for Combo Chart.");
                     container.append("p").text("Error loading chart data.");
                     return;
                 }
  
                let inflation = inflationData[1].map(d => ({ year: d.date, value: d.value })).filter(d => d.value != null);
                let unemployment = unemploymentData[1].map(d => ({ year: d.date, value: d.value })).filter(d => d.value != null);
  
                inflation = inflation.sort((a, b) => +a.year - +b.year);
                unemployment = unemployment.sort((a, b) => +a.year - +b.year);
  
                const years = inflation.map(d => d.year); // Use inflation years for x-axis domain
  
                const x = d3.scaleBand()
                    .domain(years)
                    .range([0, width])
                    .padding(0.2); // Increased padding slightly
  
                const yLeft = d3.scaleLinear()
                    .domain([0, d3.max(inflation, d => d.value) || 10]).nice() // Default max if no data
                    .range([height, 0]);
  
                const yRight = d3.scaleLinear()
                    .domain([0, d3.max(unemployment, d => d.value) || 5]).nice() // Default max if no data
                    .range([height, 0]);
  
                const xAxis = d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 3))); // Show fewer ticks
                const yAxisLeft = d3.axisLeft(yLeft).ticks(5);
                const yAxisRight = d3.axisRight(yRight).ticks(5);
  
                 // Tooltip show function
                 const showTooltip = (event, content) => {
                    tooltip.transition().duration(100).style('opacity', 0.9);
                    tooltip.html(content)
                        .style('left', (event.pageX + 15) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                };
  
                // Tooltip hide function
                const hideTooltip = () => {
                    tooltip.transition().duration(200).style('opacity', 0);
                };
                 // Tooltip move function
                 const moveTooltip = (event) => {
                    tooltip.style('left', (event.pageX + 15) + 'px')
                           .style('top', (event.pageY - 28) + 'px');
                 };
  
  
                // Draw bars for inflation
                svg.append('g')
                    .selectAll('.bar')
                    .data(inflation)
                    .enter().append('rect')
                    .attr('class', 'bar')
                    .attr('x', d => x(d.year))
                    .attr('y', d => yLeft(d.value))
                    .attr('width', x.bandwidth())
                    .attr('height', d => height - yLeft(d.value))
                    //.attr('fill', 'steelblue') // Use CSS for fill
                    .on('mouseover', (event, d) => showTooltip(event, `Year: ${d.year}<br>Inflation: ${d.value != null ? d.value.toFixed(2) + '%' : 'N/A'}`))
                    .on('mousemove', moveTooltip)
                    .on('mouseout', hideTooltip);
  
                // Line for unemployment
                const line = d3.line()
                    .x(d => x(d.year) + x.bandwidth() / 2)
                    .y(d => yRight(d.value))
                    .defined(d => d.value != null && x(d.year) !== undefined); // Only draw line for defined points
  
                 svg.append('path')
                    .datum(unemployment.filter(d => x(d.year) !== undefined)) // Filter data points not in x domain (if years mismatch)
                    .attr('class', 'line') // Use CSS for styling
                    .attr('d', line);
  
                // Add circles on line points with tooltips
                svg.selectAll('.dot')
                    .data(unemployment.filter(d => d.value != null && x(d.year) !== undefined)) // Ensure value exists and year is in scale
                    .enter().append('circle')
                    .attr('class', 'dot') // Use CSS for styling
                    .attr('cx', d => x(d.year) + x.bandwidth() / 2)
                    .attr('cy', d => yRight(d.value))
                    .attr('r', 4) // Slightly larger dots
                    .on('mouseover', (event, d) => showTooltip(event, `Year: ${d.year}<br>Unemployment: ${d.value.toFixed(2)}%`))
                    .on('mousemove', moveTooltip)
                    .on('mouseout', hideTooltip);
  
                // Axes
                svg.append('g')
                    .attr('class', 'x-axis axis')
                    .attr('transform', `translate(0,${height})`)
                    .call(xAxis)
                    .selectAll("text")
                        .style("text-anchor", "end")
                        .attr("dx", "-.8em")
                        .attr("dy", ".15em")
                        .attr("transform", "rotate(-45)"); // Rotate labels
  
                svg.append('g')
                    .attr('class', 'y-axis-left axis')
                    .call(yAxisLeft)
                    .append("text") // Left Y-axis label
                      .attr("transform", "rotate(-90)")
                      .attr("y", 0 - margin.left + 15)
                      .attr("x", 0 - (height / 2))
                      .attr("dy", "1em")
                      .style("text-anchor", "middle")
                      .style("fill", "steelblue") // Match bar color
                      .text("Inflation Rate (%)");
  
  
                svg.append('g')
                    .attr('class', 'y-axis-right axis')
                    .attr('transform', `translate(${width},0)`)
                    .call(yAxisRight)
                    .append("text") // Right Y-axis label
                        .attr("transform", "rotate(-90)")
                        .attr("y", margin.right - 15) // Adjust position relative to margin
                        .attr("x", 0 - (height / 2))
                        .attr("dy", "-0.5em") // Adjust vertical position
                        .style("text-anchor", "middle")
                        .style("fill", "red") // Match line color
                        .text("Unemployment Rate (%)");
  
                // Legend (Consider moving outside SVG for better layout control)
                const legendData = [
                    { label: "Inflation Rate", color: "steelblue" },
                    { label: "Unemployment Rate", color: "red" }
                ];
  
                const legend = svg.append('g')
                    .attr('class', 'legend')
                    .attr('transform', `translate(${width - 150},${-margin.top + 10})`); // Position top right
  
                legend.selectAll('legend-items')
                    .data(legendData)
                    .enter()
                    .append('g')
                    .attr('transform', (d, i) => `translate(0, ${i * 20})`)
                    .each(function(d) {
                        const item = d3.select(this);
                        item.append('rect')
                            .attr('x', 0)
                            .attr('y', 0)
                            .attr('width', 12)
                            .attr('height', 12)
                            .style('fill', d.color);
  
                        item.append('text')
                            .attr('x', 20)
                            .attr('y', 9) // Vertically center text
                            .attr('dy', '0.1em')
                            .text(d.label);
                    });
  
            })
            .catch(error => {
                console.error('Error fetching or processing combo chart data:', error);
                container.append("p").text("Could not load combo chart data.");
            });
    }
  
  
    // --- Function to create Word Cloud ---
    function createWordCloud() {
        const container = d3.select("#word-cloud-container");
        const containerWidth = container.node().getBoundingClientRect().width;
         // Adjust height or make it dynamic based on container aspect ratio
        const containerHeight = container.node().getBoundingClientRect().height || 500;
  
        // Consider using a proxy or server-side fetch in production
        const url = 'text_data.json';
  
        // Basic stop words list (expand as needed)
        const stopWords = new Set([
            "the", "and", "for", "are", "but", "not", "you", "your", "with", "this", "that", "have", "was", "from",
            "they", "their", "will", "about", "what", "when", "where", "which", "would", "there", "been", "has",
            "had", "were", "who", "why", "how", "can", "could", "should", "into", "than", "then", "also", "more",
            "some", "any", "all", "just", "new", "his", "her", "its", "over", "after", "before", "out", "off",
            "our", "one", "two", "three", "may", "might", "them", "him", "she", "himself", "herself", "it's", "we",
            "us", "an", "in", "of", "on", "to", "at", "as", "is", "be", "a", "i", "he", "it", "or", "by", "news",
            "says", "like", "get", "us", "first", "former", "after", "more", "how", "top", "latest", "breaking", "live" // Added more common headline words
        ]);
  
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
                }
                return response.json();
             })
            .then(data => {
                 if (!data.articles || data.articles.length === 0) {
                     console.error("No articles received from NewsAPI.");
                     container.append("p").text("Could not load headlines for word cloud.");
                     return;
                 }
                const headlines = data.articles.map(article => article.title);
                const text = headlines.join(' ');
  
                // Improved word extraction: handle punctuation better, ensure lowercase, filter stop words and short words
                 const words = text.split(/[\s.,!?;:"'()\[\]{}]+/) // Split by whitespace and common punctuation
                     .map(word => word.trim().toLowerCase())
                     .filter(word => word.length > 2 && !stopWords.has(word) && isNaN(word)); // Filter stops, short words, and numbers
  
  
                const wordCount = {};
                words.forEach(word => {
                    wordCount[word] = (wordCount[word] || 0) + 1;
                });
  
                // Limit number of words and scale size
                const maxWords = 100;
                const wordData = Object.keys(wordCount)
                    .map(word => ({ text: word, count: wordCount[word] }))
                    .sort((a, b) => b.count - a.count) // Sort by frequency
                    .slice(0, maxWords) // Take top N words
                    .map(d => ({ text: d.text, size: 10 + Math.sqrt(d.count) * 8 })); // Scale size (e.g., sqrt scale)
  
  
                 if (wordData.length === 0) {
                    console.error("No valid words found for word cloud after filtering.");
                    container.append("p").text("No words to display in cloud.");
                    return;
                }
  
                const layout = d3.layout.cloud()
                    .size([containerWidth, containerHeight - 50]) // Adjust size slightly for padding/title
                    .words(wordData)
                    .padding(5)
                    .rotate(() => (Math.random() < 0.7 ? 0 : 90 * (Math.random() > 0.5 ? 1 : -1))) // More horizontal, some vertical
                    .font("Arial") // Use font from CSS
                    .fontSize(d => d.size)
                    .on("end", drawWordCloud);
  
                layout.start();
  
                function drawWordCloud(words) {
                    // Check if SVG already exists, remove if so (for potential redraws)
                    container.select("svg").remove();
  
                    const svg = container.append("svg")
                        .attr("width", layout.size()[0])
                        .attr("height", layout.size()[1])
                        .append("g")
                        .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")");
  
                     svg.selectAll("text")
                        .data(words)
                        .enter().append("text")
                        .style("font-size", d => d.size + "px")
                        // .style("font-family", d => d.font) // Font family from CSS
                        .style("fill", () => `hsl(${Math.random() * 360}, 60%, 50%)`) // Random HSL color
                        .attr("text-anchor", "middle")
                        .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                        .text(d => d.text);
                }
            })
            .catch(error => {
                console.error('Error fetching or processing word cloud data:', error);
                 if (error.message.includes("apiKey")) {
                    container.append("p").text("Could not load word cloud data (API key issue).");
                 } else {
                    container.append("p").text("Could not load word cloud data.");
                 }
            });
    }
  
  
    // --- Function to create World Map ---
    function createWorldMap() {
        const container = d3.select("#map-container");
        const svgElement = container.select("#map-svg");
  
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = 600; // Fixed height for map aspect ratio
        svgElement.attr("width", containerWidth).attr("height", containerHeight);
  
        const projection = d3.geoMercator()
            .scale(containerWidth / (2 * Math.PI) * 1.1) // Adjust scale based on width
            .translate([containerWidth / 2, containerHeight / 1.6]); // Adjust translation
  
        const path = d3.geoPath().projection(projection);
  
        const g = svgElement.append("g");
  
         // Tooltip functions specific to map if needed, or use shared ones
         const showMapTooltip = (event, content) => {
             tooltip.transition().duration(100).style('opacity', 0.9);
             tooltip.html(content)
                 .style('left', (event.pageX + 10) + 'px')
                 .style('top', (event.pageY - 15) + 'px');
         };
         const hideMapTooltip = () => {
             tooltip.transition().duration(200).style('opacity', 0);
         };
         const moveMapTooltip = (event) => {
             tooltip.style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 15) + 'px');
         };
  
        // URLs for data
        const geoJsonUrl = "https://raw.githubusercontent.com/johan/world.geo.json/refs/heads/master/countries.geo.json";
        // Use a recent year with likely available data, or fetch multiple years/handle missing data
        const gdpApiUrl = "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?date=2022&format=json&per_page=500";
  
        Promise.all([
            d3.json(geoJsonUrl),
            d3.json(gdpApiUrl)
        ]).then(([geojson, gdpApiResponse]) => {
  
            if (!gdpApiResponse || !gdpApiResponse[1]) {
                console.error("Invalid GDP data received from World Bank API.");
                container.append("p").text("Error loading map data.");
                return;
            }
  
            const gdpArray = gdpApiResponse[1];
            const gdpPerCapita = {};
            gdpArray.forEach(d => {
                if (d.countryiso3code && d.value !== null) {
                    gdpPerCapita[d.countryiso3code] = d.value;
                }
            });
  
            const gdpValues = Object.values(gdpPerCapita).filter(v => v !== null && v > 0); // Filter out nulls/zeros for scale
  
             if (gdpValues.length === 0) {
                 console.warn("No valid GDP values found for color scale.");
                 // Use a default scale or color
             }
  
            // Use a logarithmic scale for better differentiation with skewed GDP data
             const colorScale = d3.scaleSequentialLog(d3.interpolateViridis)
                 .domain([d3.min(gdpValues) || 100, d3.max(gdpValues) || 100000]); // Provide defaults
  
  
            g.selectAll("path")
                .data(geojson.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("fill", d => {
                    const countryCode = d.id;
                    // Skip Antarctica (usually problematic geometry) and specific cases like BMU if needed
                    if (d.properties.name === "Antarctica" || countryCode === "BMU") return "none";
                    const gdp = gdpPerCapita[countryCode];
                    return (gdp && gdp > 0) ? colorScale(gdp) : "#555"; // Use gray for missing data
                })
                // Stroke/width from CSS
                .on("mouseover", function(event, d) {
                    d3.select(this).raise().style("opacity", 0.7); // Bring to front and change opacity
                    const countryName = d.properties.name;
                    const countryCode = d.id;
                    const gdp = gdpPerCapita[countryCode];
                    const gdpText = (gdp && gdp > 0) ? `$${Math.round(gdp).toLocaleString()}` : 'No Data';
                    showMapTooltip(event, `${countryName}<br>GDP per capita: ${gdpText}`);
                })
                .on("mousemove", moveMapTooltip)
                .on("mouseout", function() {
                    d3.select(this).lower().style("opacity", 1); // Reset opacity and layering
                    hideMapTooltip();
                });
  
            // Add basic zoom/pan functionality
             const zoom = d3.zoom()
                 .scaleExtent([1, 8]) // Min/max zoom levels
                 .translateExtent([[0, 0], [containerWidth, containerHeight]]) // Limit panning
                 .on("zoom", (event) => {
                     g.attr("transform", event.transform);
                 });
             svgElement.call(zoom);
  
  
             // === Add Legend ===
              const legendWidth = 300;
              const legendHeight = 10;
  
              const legendSvg = container.append("svg")
                  .attr("class", "legend")
                  .attr("width", legendWidth)
                  .attr("height", 50); // Height includes space for labels
  
              const legendScale = d3.scaleLog()
                  .domain(colorScale.domain())
                  .range([0, legendWidth]);
              
              const [minGDP, maxGDP] = colorScale.domain();
  
  
              const logMin = Math.floor(Math.log10(minGDP));
              const logMax = Math.ceil(Math.log10(maxGDP));
                  
              const legendTickValues = d3.range(logMin, logMax + 1).map(exp => Math.pow(10, exp))
  
              const legendAxis = d3.axisBottom(legendScale)
                              .tickValues(legendTickValues)
                              .tickFormat(d3.format("$.2s"));
  
              const gradientId = "gdp-gradient";
              const defs = legendSvg.append("defs");
              const gradient = defs.append("linearGradient")
                  .attr("id", gradientId)
                  .attr("x1", "0%")
                  .attr("x2", "100%");
  
              const numStops = 10;
              const legendDomain = d3.range(0, numStops).map(d => {
                  return colorScale.domain()[0] * Math.pow(
                      colorScale.domain()[1] / colorScale.domain()[0],
                      d / (numStops - 1)
                  );
              });
  
              gradient.selectAll("stop")
                  .data(legendDomain)
                  .enter()
                  .append("stop")
                  .attr("offset", (d, i) => `${(i / (numStops - 1)) * 100}%`)
                  .attr("stop-color", d => colorScale(d));
  
              legendSvg.append("rect")
                  .attr("x", 0)
                  .attr("y", 10)
                  .attr("width", legendWidth)
                  .attr("height", legendHeight)
                  .style("fill", `url(#${gradientId})`);
  
              legendSvg.append("g")
                  .attr("class", "legend-axis")
                  .attr("transform", `translate(0, ${10 + legendHeight})`)
                  .call(legendAxis);
  
  
  
        }).catch(error => {
            console.error("Error loading map data:", error);
            container.append("p").text("Could not load map data.");
        });
    }
  
    // --- Initialize all charts ---
    createComboChart();
    createWordCloud();
    createWorldMap();
  
    // Optional: Add resize listener to redraw charts if needed
    window.addEventListener('resize', () => {
        // Basic example: Re-render charts on resize (can be debounced for performance)
        // Note: Full resize handling requires recalculating dimensions and redrawing elements.
        // This is a simplified version.
         console.log("Window resized, consider implementing chart redraw logic if responsiveness is critical.");
        // Example for map (others would need similar logic):
        // d3.select("#map-container").select("svg").remove(); createWorldMap();
    });
  
  }); // End DOMContentLoaded