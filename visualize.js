
// The whole svg element

const margin = { top: 20, right: 50, bottom: 30, left: 75};

const tabWidth = 120;
const tabHeight = 40;
const duration = 750;
var width = document.body.clientWidth;
var height = document.body.clientHeight;
var innerWidth = width - margin.left - margin.right;
var innerHeight = height - margin.top - margin.bottom;
var baseSvg = d3.select('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('transform', `translate(${margin.left}, ${margin.top})`)

// A group that holds all the nodes
var g = baseSvg.append('g')
          // .on('click', d, e => {
          //   console.log(e)
          //   // chrome.tabs.update(d.toElement.__data__.data.id, {
          //     // active: true
          //   // });
          // });

// Zoom in/out the group elements, not the whole svg for better experience
const zoom = d3.zoom().on("zoom", e => {
  g.attr("transform", e.transform)}); // Changing svg.attr fucks things up.
// Enables zoom on the whole area
baseSvg.call(zoom);


function initializeTree(localRoot) {

  var root;
  width = document.body.clientWidth;
  height = document.body.clientHeight;
  innerWidth = width - margin.left - margin.right;
  innerHeight = height - margin.top - margin.bottom;
  window.treeLayout = d3.tree().size([height, width]);
  // TODO Diagonal for path?
  // update(localRoot);
  update(root);
}

// Traverse through all the nodes
// Explain TODO
// parent = Node, traverseFn = what to do while traversing, childrenFn = children if present else null
function traverse(parent, traverseFn, childrenFn) {
  if(!parent) return;

  traverseFn(parent);

  var children = childrenFn(parent);
  if(children) {
    var count = children.length;
    for(var i = 0; i < count; i++) {
      traverse(children[i], traverseFn, childrenFn);
    }
  }
}

function update(source) {
  window.root = d3.hierarchy(localRoot);
  width = document.body.clientWidth;
  height = document.body.clientHeight;
  innerWidth = width - margin.left - margin.right;
  innerHeight = height - margin.top - margin.bottom;


  const tree = treeLayout(window.root)
  console.log("Tree = ", tree);
  const links = tree.links()
  const descendants = tree.descendants()
  const linkPathGenerator = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x)



  // Collapse the roots
  // root.children.forEach(collapse);
  // var tabs = g.selectAll("g").data(root.descendants());

  // ******* LINKS ******
  var link = g.selectAll('path.link').data(links)// Links join tree.links()

  var linkEnter = link.enter().insert('path')
    .attr('class', 'link')
    .attr('d', linkPathGenerator);

  var linkUpdate = link
    .transition()
    .duration(duration)
    .attr('d', linkPathGenerator);

  var linkExit = link.exit()
    .transition()
    .duration(duration)
    .remove()

  // **** NODES *****
  var node = g.selectAll('g.node').data(descendants); // Node SVG join tree.descendants()

  var nodeEnter = node.enter().append('g')
    .attr('class', 'node')
    // .on('click', click(d))
    .attr('cursor', 'pointer');

  nodeEnter.append('rect')
    .attr('class', 'node')
    .attr('width', tabWidth)
    .attr('height', tabHeight)
    .attr('x', d => d.y)
    .attr('y', d => d.x - (tabHeight/2))
    .style('fill', d => "orange")
    .attr('fill-opacity', 0.4)
    .on('click', d => click(d.target));

  nodeEnter.append('text')
    .attr('class', 'node')
    .text(d => d.data.id)
    .attr('dy', '0.32em')
    .attr('x', d => d.y)
    .attr('y', d => d.x)
    .attr('text-anchor', d => d.children || d._children ? "end": "start");

  var nodeUpdate = nodeEnter.merge(node)
  .transition()
  .duration(duration);

  nodeUpdate.select('rect.node')
    .attr('x', d => d.y)
    .attr('y', d => d.x - (tabHeight/2));
  nodeUpdate.select('text.node')
    .attr('x', d => d.y)
    .attr('y', d => d.x);
  // nodeUpdate.select('text.node')
  //   .attr('x', d => d.y)
  //   .attr('y', d => d.x)

  var nodeExit = node.exit().transition()
    .duration(duration)
    .remove();
}

// function deleteNode(node) {
//   visit(treeData, d => {
//     if(d.children) {
//       if(d.children.includes(node)) {
//         d.children = d.without(d.children, node)
//         update(root);
//         break;
//       }
//     }
//   },
//   d => d.children && d.children.length > 0 ? d.children : null;
// );
// }



// Helper functions for collapsing and expanding nodes

function collapse(d) {
  console.log("Collapsing ", d, " where d.children = ", d.children, " and d._children = ", d._children);
  if(d.children) {
    d._children = d.children;
    d._children.foreach(collapse);
    d.children = null;
  }
}

function expand(d) {
  console.log("Expanding ", d, " where d.children = ", d.children, " and d._children = ", d._children);
  if(d._children) {
    d.children = d._children;
    d.children.foreach(expand);
    d._children = null;
  }
}

// function click(d) {
//   console.log("Clicking ", d)
//   if(d.srcElement.__data__.children) {
//     d.srcElement._children = d.srcElement.__data__.children;
//     d.srcElement.__data__.children = null;
//   }
//   else {
//     d.srcElement.__data__.children = d.srcElement._children;
//     d.srcElement._children = null;
//   }
//   console.log('Clicked ', d)
//   update(d.srcElement.__data__)
//
// }

// Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving around with a large amount of children

// function centerNode(source) {
//   scale =zoomListener.scale();
//   x = -source.y0;
// }

function toggleChildren(d) {
  console.log("Toggling ", d, " where d.children = ", d.__data__.data.children, " and d._children = ", d._children);
  if(d.__data__.data.children) {
    d._children = d.__data__.data.children;
    d.__data__.data.children = null;
  }
  else if(d._children) {
    d.__data__.data.children = d._children;
    d._children = null;
  }
  return d;
}

function click(d) {
  console.log("Clicked ", d);
  // if(d3.event.defaultPrevented) return;
  d = toggleChildren(d);
  update(d);
  // centerNode(d);
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
