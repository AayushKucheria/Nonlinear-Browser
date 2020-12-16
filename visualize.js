
// The whole svg element

const margin = { top: 20, right: 50, bottom: 30, left: 75};

const tabWidth = 120;
const tabHeight = 40;
const duration = 750;
function width() { return document.body.clientWidth};
function height() {return document.body.clientHeight};
var innerWidth = width() - margin.left - margin.right;
var innerHeight = height() - margin.top - margin.bottom;
var maxTabLength = 0;
var maxLevelTabLength = [0]


var baseSvg = d3.select('svg')
    .attr('class', 'overlay')
    .attr('width', width())
    .attr('height', height())
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
var g = baseSvg.append('g')

const zoom = d3.zoom().on("zoom", e => {
  g.attr("transform", e.transform)}); // Changing svg.attr fucks things up.
baseSvg.call(zoom);
// A group that holds all the nodes
          // .on('click', d, e => {
          //   console.log(e)
          //   // chrome.tabs.update(d.toElement.__data__.data.id, {
          //     // active: true
          //   // });
          // });

// Zoom in/out the group elements, not the whole svg for better experience

// function zoom() {
//   console.log("G is present = ", g)
//   g.attr("transform", `translate(${d3.event.translate}, ${d3.event.scale})`)
// }
// // Enables zoom on the whole area
// var zoomListener = d3.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);


function initializeTree(localRoot) {
  var root;
  window.treeLayout = d3.tree().size([height(), width()]);
  update(root);
}

// function centerNode(source) {
//   console.log("Source in centerNode = ", source)
//   scale = d3.zoomTransform(source).k;
//   x = -source.y0;
//   y = -source.x0;
//   x = x * scale + width/2;
//   y = y * scale + height/2;
//   d3.select('g').transition()
//     .attr("transform", `translate(${margin.left}, ${margin.top})scale(${scale})`)
//   zoom.scaleTo(g, scale)
//   zoom.translateTo(g, [x, y])
// }

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
  // root.x0 = height/2;
  // root.y0 = 0;
  // width = document.body.clientWidth;
  // height = document.body.clientHeight;
  console.log("Width = ", width(), " and Height = ", height());
  innerWidth = width() - margin.left - margin.right;
  innerHeight = height() - margin.top - margin.bottom;

  traverse(localRoot, function(d) { // Check tabLength with maxLength
    // totalNodes++;
    maxTabLength = Math.max(d.title.length, maxTabLength)
  },
  function(d) { // Return children if any
    return d.children && d.children.length > 0 ? d.children : null;
  });


  // Get number of nodes at each level, where level is index
  var levelWidth = [1]; // 1 at index 0 because of root node.
  var childCount = function(level, node) {


      while(maxLevelTabLength.length <= level)
        maxLevelTabLength.push(0);
      maxLevelTabLength[level] = Math.max(maxLevelTabLength[level], node.data.title.length)

    // If node has children, continue
    if(node.children && node.children.length > 0) {



      // If levelWidth doesn't have width for this level
      // Initialize width with value 0
      if(levelWidth.length <= level + 1)
        levelWidth.push(0);

      // Increment next level's width by this level's node's children
      levelWidth[level + 1] += node.children.length;
      // console.log(node)
      // For each child, keep the cycle going
      node.children.forEach(d => childCount(level+1, d))
    }
  }
  childCount(0, root);

  // var newHeight = d3.max(levelWidth) * 25; // Choose width with most nodes, and 25 pixels per line
  treeLayout = d3.tree().size([height(), width()]);
  const tree = treeLayout(window.root)
  console.log("Tree = ", tree);
  const links = tree.links()
  const descendants = tree.descendants()
  const linkPathGenerator = d3.linkHorizontal()
    .x(d => d.depth * (maxTabLength * 10))
    .y(d => d.x) // TODO

  // descendants.forEach(d => {
  //   d.y = d.depth * (maxTabLength * 10);
  // })

  // Collapse the roots
  // root.children.forEach(collapse);
  // var tabs = g.selectAll("g").data(root.descendants());


  // **** NODES *****
  var node = g.selectAll('g.node').data(descendants); // Node SVG join tree.descendants()
  console.log("Source = ", source);

  var nodeEnter = node.enter().append('g')
    .attr('class', 'node')
    // .attr('transform', `translate(${source.y0}, ${source.x0})`)
    .attr('cursor', 'pointer')
    .on('click', d => {
      console.log("Click event ", d);
      click(d.target)
    });

  nodeEnter.append('rect')
    .attr('class', 'node')
    .attr('width', d => maxLevelTabLength[d.depth] * 6)
    .attr('height', tabHeight)
    .attr('x', d => d.depth * (maxTabLength * 11)) // or 10?
    .attr('y', d => d.x - tabHeight/2)
    .style('fill', d => "orange")
    .attr('fill-opacity', 0.4)

  nodeEnter.append('text')
    .attr('class', 'node')
    .text(d => d.data.title)
    .attr('dy', '0.32em')
    .attr('x', d => d.depth * (maxTabLength * 10))
    .attr('y', d => d.x)

  var nodeUpdate = nodeEnter.merge(node)
  .transition()
  .duration(duration)

  nodeUpdate.select('rect.node')
    .attr('x', d => d.depth * (maxTabLength * 10))
    .attr('y', d => d.x - tabHeight/2)

  nodeUpdate.select('text.node')
    .attr('x', d => d.depth * (maxTabLength * 10))
    .attr('y', d => d.x)

  var nodeExit = node.exit().transition()
    .duration(duration)
    .remove();

  // ******* LINKS ******
  var link = g.selectAll('path.link').data(links)// Links join tree.links()

  // Enter
  link.enter().insert('path')
    .attr('class', 'link')
    .attr('d', linkPathGenerator);

  // Update
  link
    .transition()
    .duration(duration)
    .attr('d', linkPathGenerator);

  // Exit
  link.exit()
    .transition()
    .duration(duration)
    .remove()

  console.log(maxLevelTabLength)
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
  // console.log("Clicked ", d);
  // if(d3.event.defaultPrevented) return;
  d = toggleChildren(d);
  // centerNode(d);

  update(d);
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
