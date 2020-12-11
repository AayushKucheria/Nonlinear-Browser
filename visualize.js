

const svg = d3.select('svg')
const width = document.body.clientWidth;
const height = document.body.clientHeight;
const margin = { top: 0, right: 50, bottom: 0, left: 75};
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const treeLayout = d3.tree().size([height, width]);



const g = svg
    .attr('width', width)
    .attr('height', height)
  .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
    // .selectAll(".tick text")
    // .call(wrap,15);

let transform;

const zoom = d3.zoom().on("zoom", e => {
  g.attr("transform", (transform = e.transform));
});
svg.call(zoom);

function visualizeTree(localRoot) {

  const root = d3.hierarchy(localRoot);
  const links = treeLayout(root).links();
  const linkPathGenerator = d3.linkVertical()
    .x(d => d.x)
    .y(d => d.y)

  var tabs = g.selectAll("g").data(root.descendants());

  g.selectAll('path').data(links)
    .join(
      enter => enter.append('path')
        .attr('d', linkPathGenerator),
      update => {
        update
        .transition()
        .duration(750)
        .attr('d', linkPathGenerator)
      },
      exit => exit.remove()
    );

  // g.selectAll('text').data(root.descendants())
  //   .join(
  //     enter => {
  //       enter.append('text')
  //         .text(d => d.data.title)
  //         .attr('dy', '0.32em')
  //         .attr('x', d => d.x)
  //         .attr('y', d => d.y)
  //         .style('fill', 'red')
  //     },
  //     update => {
  //       update
  //       .transition()
  //       .duration(750)
  //       .attr('x', d => d.x)
  //       .attr('y', d => d.y)
  //     },
  //     exit => exit.remove()
  //   );

  tabs
    .join(
      enter => {
        enter
        .append('text')
          .text(d => d.data.title)
          .attr('dy', '0.32em')
          .attr('x', d => d.x)
          .attr('y', d => d.y + 6)
          .style('fill', 'red')
          .call(wrap, 80);
      enter
        .append('rect')
          .attr('width', 80)
          .attr('height', 40)
          .attr('x', d => d.x)
          .attr('y', d => d.y)
          .attr('fill-opacity', 0.2);
      },
      update => {
        update
          .transition()
          .duration(750)
          .selectAll('text')
            .attr('x', d => d.x)
            .attr('y', d => d.y);

        update
          .transition()
          .duration(750)
          .selectAll('rect')
            .attr('x', d => d.x)
          . attr('y', d => d.y);
      },
      exit => exit.remove()
    );

    // g.append('rect')
    //     .attr('height', 20)
    //     .attr('width', 100)
    //     .style('fill', 'green')
    //     .on('mouseover', (d, i, elements) => {
    //         d3.select(elements[i])
    //            .transition()
    //            .duration(500)
    //            .style('fill', 'red');
    //     })
    //     .on('mouseout', (d, i, elements) => {
    //         d3.select(elements[i])
    //             .transition()
    //             .duration(500)
    //             .style('fill', 'green');
    //     });

}

function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
            }
        }
    });
}


// const svg = d3.select('svg');
//
// const width = +svg.attr('width');
// const height = +svg.attr('height');
//
// //create a rectangle
// const render = data1 => {
//
//   // value accesors
//   const xValue = d => d.population;
//   const yValue = d => d.country;
//   const margin = {top: 50, bottom: 100, left: 140, right: 40}
//   const innerWidth = width - margin.left - margin.right;
//   const innerHeight = height - margin.top - margin.bottom;
//
//   const xScale = d3.scaleLinear()
//   							.domain([0,d3.max(data1,xValue)])
//   							.range([0,innerWidth]);
//
//   const yScale = d3.scaleBand()
//   							.domain(data1.map(yValue))
//   							.range([0,innerHeight])
//   							.padding(0.1)
//
//   const xAxisTickFormat = number => d3.format('.3s')(number).replace('G','B')
//   const xAxis = d3.axisBottom(xScale)
//   								.tickFormat(xAxisTickFormat)
//   								.tickSize(-innerHeight)
//   const yAxis = d3.axisLeft(yScale)
//
//   const g = svg.append('g')
//   					.attr('transform',`translate(${margin.left},${margin.top})`)
//
//   g.append('g').call(yAxis)
//     .selectAll('.domain, .tick line')
//     .remove()
//
//   const xAxisG = g.append('g').call(xAxis)
//     .attr('transform',`translate(0,${innerHeight})`)
//
//   xAxisG.select('.domain').remove()
//
//   xAxisG.append('text')
//     		.text('population')
//     		.attr('fill','black')
//   			.attr('x',innerWidth/2)
//   			.attr('y',60)
//
// 	g.selectAll('rect')
//     .data(data1)
//     .enter()
//     .append('rect')
//   	.attr('y',d => yScale(yValue(d)))
//     .attr('width',d => xScale(xValue(d)))
//     .attr('height',yScale.bandwidth())
//
//   g.append('text')
//     .attr('y',-10)
//     .text('Top 10 most populous countries in the world.')
//   	.attr('class','headline')
// }
//
// // returns a promise
// d3.csv('data.csv').then(data1 => {
//   data1.forEach(d => {
//   	d.population = +d.population * 1000
//   })
//   render(data1)
// });
