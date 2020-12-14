
// The whole svg element
const svg = d3.select('svg')
const width = document.body.clientWidth;
const height = document.body.clientHeight;
const margin = { top: 20, right: 50, bottom: 30, left: 75};
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;
const tabWidth = 120;
const tabHeight = 40;
const treeLayout = d3.tree().size([height, width]);

// Our groups?
const g = svg
    .attr('width', width)
    .attr('height', height)
    // .attr("text-anchor", "middle")
  .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .on('click', d => {
      chrome.tabs.update(d.toElement.__data__.data.id, {
        active: true
      });
    })

let transform;

const zoom = d3.zoom().on("zoom", e => {
  g.attr("transform", (transform = e.transform));
});
svg.call(zoom);

function visualizeTree(localRoot) {

  const root = d3.hierarchy(localRoot);
  const links = treeLayout(root).links();
  const linkPathGenerator = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x)

  // var tabs = g.selectAll("g").data(root.descendants());

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

  g.selectAll('text').data(root.descendants())
    .join(
      enter => {
        enter.append('text')
          .text(d => d.data.id)
          .attr('dy', '0.32em')
          .attr('x', d => d.y)
          .attr('y', d => d.x)
          .style('fill', 'red');
      },
      update => {
        update
          .transition()
          .duration(750)
          .attr('x', d => d.y)
          .attr('y', d => d.x);
      },
      exit => exit.remove()
    );

    g.selectAll('rect').data(root.descendants())
      .join(
        enter => {
          enter.append('rect')
            .attr('width', tabWidth)
            .attr('height', tabHeight)
            .attr('x', d => d.y)
            .attr('y', d => d.x)
            .attr('fill-opacity', 0.2)
        },
        update => {
          update
            .transition()
            .duration(750)
            .attr('x', d => d.y)
            .attr('y', d => d.x);
        },
        exit => exit.remove()
      );
}



// Helper functions for collapsing and expanding nodes

function collapse(d) {
  if(d.children) {
    d._children = d.children;
    d._children.foreach(collapse);
    d.children = null;
  }
}

function expand(d) {
  if(d._children) {
    d.children = d._children;
    d.children.foreach(expand);
    d._children = null;
  }
}

// Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving around with a large amount of children

// function centerNode(source) {
//   scale =zoomListener.scale();
//   x = -source.y0;
// }

function toggleChildren(d) {
  if(d.children) {
    d._children = d.children;
    d.children = null;
  }
  else if(d._children) {
    d.children = d._children;
    d._children = null;
  }
  return d;
}

function click(d) {
  if(d3.event.defaultPrevented) return;
  d = toggleChildren(d);
  update(d);
  centerNode(d);
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
