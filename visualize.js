

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

let transform;

const zoom = d3.zoom().on("zoom", e => {
  g.attr("transform", (transform = e.transform));
});
svg.call(zoom);

function visualizeTree(localRoot) {

  const x = svg.attr('width', width)
      .attr('height', height)
    .append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);


  const root = d3.hierarchy(localRoot);
  // console.log(root)
  const links = treeLayout(root).links();
  const linkPathGenerator = d3.linkVertical()
    .x(d => d.x)
    .y(d => d.y)

  // cost t = svg.transition().duration(2000);

  g.selectAll('path').data(links)
    .join(
      enter => enter.append('path')
        .attr('d', linkPathGenerator),
      update => update,
        // console.log(d
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
  g.selectAll('rect').data(root.descendants())
    .enter().append('rect')
    .attr('x', function(d) { return (d.x-2);})
    .attr('y', function(d) { return (d.y-5);})
    .attr('width',10  )
    .attr('height', 15).attr('stroke',"black").attr('stroke-width',"5")
    .style("fill", "white").style("opacity", 0.5);

  g.selectAll('text').data(root.descendants())
    .join(
      enter => {
        a = enter.append('text')
          .attr('x', d => d.x)
          .attr('y', d => d.y)
          .attr('dy', '0.32em')
          .attr('text-anchor', d => d.children? 'middle' : 'start')
          .attr('font-size', d => 3 - d.depth + 'em')
          .text(d =>  d.data.id)
      },
      update => {
        update
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .text(d => d.data.id)
        .attr('dy', '0.32em')
        .attr('text-anchor', d => d.children? 'middle' : 'start')
        .attr('font-size', d => 3 - d.depth + 'em');
      },
      exit => exit.remove()
    );

  var node = g.selectAll('g').data(root.descendants())
    .enter().append('g')
      .attr('transform', function(d, i) { return "translate (" + d.x + "," + d.y + ")"});

  node.append('rect')
    .attr('width', 12)
    .attr('height', 40);

  node.append('text')
    .attr('x', d => d.x)
    .attr('y', d => 20)
    .attr('dy', '0.32em')
    .attr('text-anchor', d => d.children? 'middle' : 'start')
    .attr('font-size', d => 3 - d.depth + 'em')
    .text(d =>  d.data.id);

  // const nodesEnter = nodes.enter().append('g');
  // nodesEnter.append('circle')
  //   .merge(groups.select('circle'))
  //     .attr('r' d => 50)
  //     .attr('fill')


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
