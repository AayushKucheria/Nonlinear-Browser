
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
window.currentRoot;

var baseSvg = d3.select('svg')
    .attr('class', 'overlay')
    .attr('width', width())
    .attr('height', height())
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
var g = baseSvg.append('g')

const zoom = d3.zoom().on("zoom", e => {
  g.attr("transform", e.transform)}); // Changing svg.attr fucks things up.
baseSvg.call(zoom);
          // .on('click', d, e => {
          //   console.log(e)
            // chrome.tabs.update(d.toElement.__data__.data.id, {
            //   active: true
            // });
          // });

// Zoom in/out the group elements, not the whole svg for better experience

// function zoom() {
//   console.log("G is present = ", g)
//   g.attr("transform", `translate(${d3.event.translate}, ${d3.event.scale})`)
// }
// // Enables zoom on the whole area
// var zoomListener = d3.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

// Levels (including root):
function getSubtree(subRoot) {
  var res = subRoot;
  // res.push(subRoot);
  // temp[0].children.forEach(d1 => d1.children.forEach(d2 => d2.children.forEach(de3 => de3.children = [])));

  function check(depth, innerRoot, parent) {
    if(depth == 2) { // Only add node without children
      innerRoot.children = [];
      parent.children.push(innerRoot);
      return;
    }
    else { // Add node and recurse children
      var tempChildren = innerRoot.children;
      innerRoot.children = [];
      if(parent != null)
        parent.children.push(innerRoot);
			if(tempChildren.length > 0)
      	tempChildren.forEach(a => check(depth+1, a, innerRoot));
    }
  }
	res.children.forEach(a => check(0, res, null)) // TODO Maybe assign?
	return res;
}


function initializeTree(localRoot) {
  console.log("Local Root = ", localRoot);
  window.jsonRoot = getSubtree(localRoot);
  console.log("jsonRoot = ", window.jsonRoot);
  root = d3.hierarchy(window.jsonRoot);
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

  window.d3Root = d3.hierarchy(window.jsonRoot);
  window.d3Root.x0 = height/2;
  window.d3Root.y0 = 0;
  innerWidth = width() - margin.left - margin.right;
  innerHeight = height() - margin.top - margin.bottom;

  traverse(window.jsonRoot, function(d) { // Check tabLength with maxLength
    // totalNodes++;
    // console.log(d);
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
  childCount(0, window.d3Root);

  // var newHeight = d3.max(levelWidth) * 25; // Choose width with most nodes, and 25 pixels per line
  treeLayout = d3.tree().size([height(), width()]);
  const tree = treeLayout(window.d3Root)
  const links = tree.links()
  const descendants = tree.descendants()
  const linkPathGenerator = d3.linkVertical()
    // .x(d => d.depth * (maxTabLength * 10)) // This was for fitting text to the tab?
    .x(d => d.x)
    .y(d => d.y)
  // console.log("d3Root = ", window.jsonRoot);
  console.log("Updated Tree = ", tree);

  var menu = [
    {
      title: "Go to tab",
      action: function(elem) {
        console.log("Clicked on go to tab for ", elem);
        chrome.tabs.update(elem.data.id, {
          active: true
        });
      }
    },
    {
      title: "Toggle",
      action: function(elem) {
        toggleChildren(elem);
      }
    },
    {
      title: "View as Root",
      action: function(elem) {
        console.log("Clicked on View as root for ", elem);
      }
    },
    {
      title: "Delete Tab",
      action: function(elem) {
        // console.log("Clicked on View as root for ", elem);
        chrome.tabs.remove(elem.data.id)
        update(elem)
      }
    }
  ]
  // **** NODES *****
  var node = g.selectAll('g.node').data(descendants); // Node SVG join tree.descendants()
  // console.log("Source = ", source);

  var nodeEnter = node.enter().append('g')
    .attr('class', 'node')
    .attr('fill-opacity', 0)
    .attr('stroke-opacity', 0)
    .attr("transform", d => `translate(${source.x0},${source.y0})`)
    .attr('cursor', 'pointer')
    // .on('click', function(event, d) {
    //   click(event, d)
    // })
    .on('contextmenu', function(event, d) {
      window.contextMenu(event, d, menu);
    })

  nodeEnter.append('rect')
    .attr('class', 'node')
    .attr('width', d => tabWidth)//maxLevelTabLength[d.depth] * 6)
    .attr('height', tabHeight)
    // .attr('x', d => d.x - tabHeight/2) // or 10?
    // .attr('y', d => d.depth * (maxTabLength * 11))
    .style('fill', d => "orange")
    // .attr('fill-opacity', 1)

  nodeEnter.append('text')
    .attr('class', 'node')
    .text(d => d.data.title)
    .attr('dy', '0.32em')
    // .attr('x', d => d.depth * (maxTabLength * 10))

  var nodeUpdate = nodeEnter.merge(node)
    .transition()
    .duration(duration)
    .attr("transform", d => `translate(${d.x},${d.y})`)
  // .attr('fill-opacity', 1);

  nodeUpdate.select('rect.node')
    .attr('fill-opacity', 0.4)
    // .attr('x', d => d.x - tabHeight/2) // or 10?
    // .attr('y', d => d.depth * (maxTabLength * 11))

  //   // .attr('x', d => d.depth * (maxTabLength * 10))
  //   .attr('y', d => d.x - tabHeight/2)
  nodeUpdate.select('text.node')
    .attr('fill-opacity', 1)
    .text(d => d.data.title);

  //   // .attr('x', d => d.depth * (maxTabLength * 10))

  var nodeExit = node.exit().transition()
    .duration(duration)
    .remove()
    .attr("transform", d => `translate(${source.x},${source.y})`)

  nodeExit.select('rect.node')
    .attr('width', 1e-6)
    .attr('height', 1e-6);
  nodeExit.select('text.node')
    .style('fill-opacity', 1e-6)

  // ******* LINKS ******
  var link = g.selectAll('path.link').data(links)// Links join tree.links()

  // Enter
  var linkEnter = link.enter().append('path') // or insert
    .attr('class', 'link')
    .attr('d', linkPathGenerator)
    // .attr('stroke-opacity', 1);

  // Update
  var linkUpdate = link.merge(linkEnter)
    .transition()
    .duration(duration)
    .attr('d', linkPathGenerator)
    .attr('stroke-opacity', 1);

  // Exit
  var linkExit = link.exit()
    .transition()
    .duration(duration)
    .attr('d', d => {
      var o = {x: source.x, y: source.y}
      return linkPathGenerator({source: o, target: o})
    })
    .attr('stroke-opacity', 1e-6)
    .remove();
  // linkExit.select('path.link')

  descendants.forEach(d => {
    d.x0 = d.x;
    d.y0 = d.y;
  });
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
  if(d.data.children) {
    d.data._children = d.data.children;
    d.data.children = null;
  }
  else if(d.data._children) {
    d.data.children = d.data._children;
    d.data._children = null;
  }
  update(d);
}
