

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

d3.json('example.json')
  .then(data => {

    const root = d3.hierarchy(data);
    const links = treeLayout(root).links();
    const linkPathGenerator = d3.linkHorizontal()
      .x(d => d.x)
      .y(d => d.y)

    g.selectAll('path').data(links)
      .enter().append('path')
        .attr('d', linkPathGenerator);

    g.selectAll('text').data(root.descendants())
      .enter().append('text')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('dy', '0.32em')
        .attr('text-anchor', d => d.children? 'middle' : 'start')
        .attr('font-size', d => 3 - d.depth + 'em')
        .text(d =>  d.data.id)
  });


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
