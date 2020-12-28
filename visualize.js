
const margin = { top: 20, right: 20, bottom: 20, left: 20};
// const margin = { top: 300, right: 300, bottom: 500, left: 700};
window.tabWidth = 200;
const tabHeight = 80;
const duration = 750;
// function width() { return document.body.clientWidth};
// function height() {return document.body.clientHeight};

var innerWidth = document.body.clientWidth - margin.left - margin.right;
var innerHeight = document.body.clientHeight - margin.top - margin.bottom;
var maxTabLength = 0;
var maxLevelTabLength = [0]
var currentZoom = 1;
var currentPos = {x: 0, y: 0}
treeLayout = d3.tree()
  .nodeSize([tabWidth, tabHeight])
  .separation(function(a, b) { return a.parent == b.parent ? 1.5 : 1.5}) // TODO works but can experiment with
window.fontSize = 16;

window.currentRoot;

var div = d3.select("rect").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

var ancestorSvg = d3.select('body').append('svg')
.attr('height', 3 * tabHeight / 2)
.attr('width', innerWidth)
.attr('viewBox', d => "" + margin.left + " " + margin.top + " " + innerWidth + " " + 3*tabHeight/2)

  // .attr("transform",d => `translate(${+margin.left},${+margin.top})`)
  // .attr('x', -innerWidth)
  // .attr('y', -innerHeight)

var a = ancestorSvg.append('g')
  .attr('id', 'ancestorContainer')
  // .attr("transform",d => `translate(40,40)`)
  // .attr('x', margin.left + 20)
  // .attr('y', margin.top + 20)

var baseSvg = d3.select('body').append('svg')
  .attr('class', 'overlay')
  .attr('width', innerWidth)
  .attr('height', innerHeight)
  .attr('viewBox', d => "" + (-innerWidth / 2) + " " + (-innerHeight / 2) + " " + innerWidth + " " + innerHeight)

// baseSvg.append('rect')
//   .attr('width', '100%')
//   .attr('height', '100%')
//   .style('fill', 'white')

var g = baseSvg.append('g')
  .attr('id', 'treeContainer')
// .on('click', d, e => {
//   console.log(e)
g.on("mouseover", function(d)
{
  d3.select(this).style("cursor","pointer");
});

  // chrome.tabs.update(d.toElement.__data__.data.id, {
  //   active: true
  // });
// });


const zoom = d3.zoom()
  .on("zoom", function(e) {
    currentZoom = e.transform.k
    currentPos = {x: e.transform.x, y: e.transform.y}
    g.attr('transform', d => e.transform)
  })

baseSvg.call(zoom)


  function initializeTree(localRoot) {

    root = d3.hierarchy(localRoot)
    root.x0 = innerWidth/2;
    root.y0 = innerHeight/2;
    window.currentRoot = root;

    drawTree(root);
    centerNode(root);
  }

  function updateTree(localRoot) {
    root = d3.hierarchy(localRoot);
    let previousRootId = window.currentRoot.data.id;
    window.currentRoot = undefined;

    function traverseTree(subRoot) { // TODO visit function?
      if(subRoot.data.id === previousRootId)
        return subRoot
      else
        return subRoot.children.forEach(child => traverseTree(child))
    }

    window.currentRoot = traverseTree(root)
    if(!window.currentRoot)
      window.currentRoot = root;
    drawTree(window.currentRoot)
    // centerNode(window.currentRoot);
  }

  function setAsRoot(newRoot) {
    window.currentRoot = newRoot;
    // console.log("Setting root = ", window.currentRoot);
    drawTree(window.currentRoot);
  }

  function centerNode(source) {
    x = -source.x0;
    y = -source.y0;
    x = x * currentZoom - tabWidth/2;
    y = y * currentZoom - tabHeight/2;
    d3.select('g').transition()
      .attr("transform", d => `translate(${x}, ${y})scale(${currentZoom})`)

    // TODO Try
    // zoom.scale(scale)
    // zoom.translate([x, y])
  }

  function printMe(elem, e) {
    // console.log("Transform: ", elem, ", ", e)
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

  function drawTree(source) {
    // console.log("Source = ", source);
    window.currentRoot = source
    innerWidth = document.body.clientWidth - margin.left - margin.right;
    innerHeight = document.body.clientHeight - margin.top - margin.bottom;

    // window.d3Root = d3.hierarchy(window.jsonRoot);
    // window.d3Root.x0 = innerWidth/2;
    // window.d3Root.y0 = innerHeight/2;

    // traverse(window.jsonRoot, function(d) { // Check tabLength with maxLength
    //   // totalNodes++;
    //   // console.log(d);
    //   maxTabLength = Math.max(d.title.length, maxTabLength)
    // },
    //   function(d) { // Return children if any
    //   return d.children && d.children.length > 0 ? d.children : null;
    // });


    // Get number of nodes at each level, where level is index
    // var levelWidth = [1]; // 1 at index 0 because of root node.
    // var childCount = function(level, node) {
    //
    //
    //     while(maxLevelTabLength.length <= level)
    //       maxLevelTabLength.push(0);
    //     maxLevelTabLength[level] = Math.max(maxLevelTabLength[level], node.data.title.length)
    //
    //   // If node has children, continue
    //   if(node.children && node.children.length > 0) {
    //
    //
    //
    //     // If levelWidth doesn't have width for this level
    //     // Initialize width with value 0
    //     if(levelWidth.length <= level + 1)
    //       levelWidth.push(0);
    //
    //     // Increment next level's width by this level's node's children
    //     levelWidth[level + 1] += node.children.length;
    //     // console.log(node)
    //     // For each child, keep the cycle going
    //     node.children.forEach(d => childCount(level+1, d))
    //   }
    // }
    // childCount(0, window.d3Root);
    d3.select('body').style("background","url(https://www.xxix.co/assets/svg/dot-grid-2x.svg)no-repeat");


    const tree = treeLayout(window.currentRoot)
    const links = tree.links()
    const descendants = tree.descendants()
    const ancestors = tree.ancestors();
    const linkPathGenerator = d3.linkVertical()
    //   .source(d => {
    //     console.log(d)
    //   [d.x + tabWidth/2, d.depth * 180 + tabHeight]
    // })
    //   .target(d => [d.x + tabWidth/2, d.depth * 180])
      .x(d => d.x + tabWidth/2)
      .y(d => d.parent? d.depth * 180 : d.depth * 180 + tabHeight)
      // .y(d => (!d.parent || d.children)? d.depth * 180 + tabHeight: d.depth * 180 )
    descendants.forEach(d => d.y = d.depth * 180)

    console.log("Ancestors: ", ancestors);

    var menu = [
      {
        title: "Go to tab",
        action: function(event, elem) {
          // console.log("Clicked on go to tab for ", elem);
          chrome.tabs.update(elem.data.id, {
            active: true
          });
        }
      },
      {
        title: "Toggle",
        action: function(event, elem) {
          toggleChildren(elem);
        }
      },
      {
        title: "View as Root",
        action: function(event, elem) {
          //console.log("Clicked on View as root for ", elem);
          setAsRoot(elem)
          centerNode(window.currentRoot);

        }
      },
      {
        title: "Delete Tab",
        action: function(event, elem) {
          chrome.tabs.remove(elem.data.id)
        //  console.log("current tab being deleted",elem);
          //removeTab(elem.data.id);
          //drawTree(window.currentRoot);
          // removeTab(elem.data.id) // TODO ??
        }
      },
      {
        title: "Hide the hidden tabs",
        action: function(event, elem)
      {
        hide(elem,0);
      }
    },
    {
      title: "Show the hidden tabs",
      action: function(event,elem)
      {
        hide(elem,1);
      }
    },
      {
        title: "Add to tabs that want to be hidden",
        action: function(event,elem)
        {
          list_hide(elem);
        }
      }
    ]

    // ******* ANCESTORS *******
    // ancestors.forEach(function(d, i) {
    //   d.x = margin.left + tabWidth * i + 20;
    //   d.y = margin.top + 60;
    // })
    var ancestor = a.selectAll('g.ancestor').data(ancestors)
      // .attr('x', d => d.x)
      // .attr('y', d => d.y)


    var ancestorEnter = ancestor.enter().append('g')
      .attr('class', 'node')
      .attr('fill-opacity', 1)
      .attr('stroke-opacity', 1)
      .attr('dx', function(d, i) {margin.left + 40 * i})
      .attr('y', 20)
      .attr('cursor', 'pointer')
      .on('contextmenu', function(event, d) {
        window.contextMenu(event, d, menu);
      })
      .style('font-size', window.fontSize)
      .style('font-weight', 400)

    ancestorEnter.append('rect')
      .attr('class', 'node')
      .attr('width', tabWidth)
      .attr('rx', '20')
      .attr('ry', '20')
      .attr('fill', '#97d0ef')
      .attr('height', tabHeight)

    ancestorEnter.append('text')
      .attr('id', 'line1')
      .attr('class', 'nodeText')
      // .attr('dy', "2em")
      .attr('dy', '1em')
      .text(d => d.data.lines[0])
      .attr('fill-opacity', 1)

    ancestorEnter.append('text')
      .attr('id', 'line2')
      .attr('class', 'nodeText')
      // .attr('y', 20)
      .attr('dy', '2em')
      .text(d => d.data.lines[1])
      .attr('fill-opacity', 1)

    ancestorEnter.append('text')
      .attr('id', 'line3')
      .attr('class', 'nodeText')
      // .attr('y', 30)
      .attr('dy', '3em')
      // .attr('dy', '2.62em')
      .text(d => d.data.lines[2])

    ancestorEnter.append('text')
      .attr('id', 'line4')
      .attr('class', 'nodeText')
      // .attr('y', 40)
      .attr('dy', '4em')
      .text(d => d.data.lines[3])

    var ancestorUpdate = ancestorEnter.merge(ancestor)
      .transition()
      .duration(duration)
      .attr("transform",d => `translate(${d.x},${d.y})`)

    ancestorUpdate.select('rect.ancestor')
      .attr('fill-opacity', 0.4)

    ancestorUpdate.select('#line1')
      // .attr('y', 5)
      // .attr('dy', '0.42em')
      .text(d => d.data.lines[0])
      .attr('fill-opacity', 1)

    ancestorUpdate.select('#line2')
      // .attr('y', 6)
      // .attr('dy', '1.52em')
      .text(d => d.data.lines[1])
      .attr('fill-opacity', 1)

    ancestorUpdate.select('#line3')
      // .attr('y', 7)
      // .attr('dy', '2.62em')
      .text(d => d.data.lines[2])
      .attr('fill-opacity', 1)

    ancestorUpdate.select('#line4')
      // .attr('y', 8)
      // .attr('dy', '3.72em')
      .text(d => d.data.lines[3])
      .attr('fill-opacity', 1)

    console.log("AncestorEnter = ", ancestorEnter)
    console.log("AncestorUpdate = ", ancestorUpdate)

    // ******* LINKS ******
    var link = g.selectAll('path.link').data(links)// Links join tree.links()


    var linkEnter = link.enter().append('path') // or insert
      .attr('class', 'link')
      .attr('d', linkPathGenerator);
      // .attr('stroke-opacity', 1);

    var linkUpdate = link.merge(linkEnter)
      .transition()
      .duration(duration)
      .attr('d', linkPathGenerator)
      .attr('stroke-opacity', 1);

    var linkExit = link.exit()
      .transition()
      .duration(duration)
      .attr('d', d => {
        var o = {x: source.x, y: source.y}
        return linkPathGenerator({source: o, target: o})
      })
      .attr('stroke-opacity', 1e-6)
      .remove();


    // **** NODES *****
    var node = g.selectAll('g.node')
      .data(descendants)



    var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('fill-opacity', 1)
      .attr('stroke-opacity', 1)
      .attr("transform",d => `translate(${source.x0},${source.y0})`)
      .attr('cursor', 'pointer')
      .on('contextmenu', function(event, d) {
        window.contextMenu(event, d, menu);
      })
      .style('font-size', window.fontSize)
      .style('font-weight', 400)
      .on('mouseover', function(event, d) {
        // console.log(d)
        // console.log(this)
        // console.log(thi)
        // d3.select(this).selectAll('text').style('textDecoration', 'underline')
          // .style('stroke', 'green')
          // .style('border-width', '8')
        // d3.select(this).data(d.links()).attr('style', 'fill: green')
      })

    nodeEnter.append('rect')
      .attr('class', 'node')
      .attr('width', tabWidth)
      .attr('rx', '20')
      .attr('ry', '20')
      .attr('fill', '#97d0ef')
      .attr('height', tabHeight)
      .on('click', function(event, d) {
        toggleChildren(d);
        console.log("Click event = ", event, " and scale: ", event.scale);
        // centerNode(d);
      })

    nodeEnter.append('text')
      .attr('id', 'line1')
      .attr('class', 'nodeText')
      // .attr('dy', "2em")
      .attr('dy', '1em')
      .text(d => d.data.lines[0])
      .attr('fill-opacity', 1)

    nodeEnter.append('text')
      .attr('id', 'line2')
      .attr('class', 'nodeText')
      // .attr('y', 20)
      .attr('dy', '2em')
      .text(d => d.data.lines[1])
      .attr('fill-opacity', 1)

    nodeEnter.append('text')
      .attr('id', 'line3')
      .attr('class', 'nodeText')
      // .attr('y', 30)
      .attr('dy', '3em')

      // .attr('dy', '2.62em')
      .text(d => d.data.lines[2])

    nodeEnter.append('text')
      .attr('id', 'line4')
      .attr('class', 'nodeText')
      // .attr('y', 40)
      .attr('dy', '4em')
      .text(d => d.data.lines[3])

    var commentBubble = nodeEnter.append('foreignObject')
      .attr('class', 'commentBubble')
      .attr('width', 120)
      .attr('height', 60)
      .attr('x', tabWidth)
      .attr('y', -tabHeight/2)
      .attr('rx', '20')
      .attr('ry', '20')
      .style('opacity', '0')
      .append("xhtml:div")
      .html("<input type='text' placeholder='Add your comments here!'></input>")
      .on('click', function(event, d) {d3.select(this).style('opacity', '1')})
      .on('mouseover', function(event, d) {d3.select(this).style('opacity', '1')})
      .on('mouseout', function(event, d) {d3.select(this).style('opacity', '0')})


    nodeEnter.append('rect')
      .attr('class', 'commentHover')
      .attr('width', 20)
      .attr('height', 10)
      .attr('x', tabWidth - 10)
      .attr('rx', '20')
      .attr('ry', '20')
      .on('mouseover', function(event, d) {
        var nodeSelection = d3.select(this.parentNode)
        nodeSelection.select('.commentBubble').style('opacity', '1')
      })
      .on('mouseout', function(event, d) {
        setTimeout(() => {
          var nodeSelection = d3.select(this.parentNode)
          nodeSelection.select('.commentBubble').style('opacity', '0');},
          2000)
    })
      // .attr('fill', 'white')
      // .attr('')






      // .on("mouseover", function(d) {
      //         div.transition()
      //             .duration(200)
      //             .attr('x',15)
      //             .attr('y',5)
      //             .style("opacity", .9)
      //             .text(d => d.title)});




    var nodeUpdate = nodeEnter.merge(node)
      .transition()
      .duration(duration)
      .attr("transform",d => `translate(${d.x},${d.y})`)
      // .attr('fill-opacity', 1);

    nodeUpdate.select('rect.node')
      .attr('fill-opacity', 0.4);
      // .attr('x', d => d.x - tabHeight/2) // or 10?
      // .attr('y', d => d.depth * (maxTabLength * 11))

    nodeUpdate.select('#line1')
      // .attr('y', 5)
      // .attr('dy', '0.42em')
      .text(d => d.data.lines[0])
      .attr('fill-opacity', 1)

    nodeUpdate.select('#line2')
      // .attr('y', 6)
      // .attr('dy', '1.52em')
      .text(d => d.data.lines[1])
      .attr('fill-opacity', 1)

    nodeUpdate.select('#line3')
      // .attr('y', 7)
      // .attr('dy', '2.62em')
      .text(d => d.data.lines[2])
      .attr('fill-opacity', 1)

    nodeUpdate.select('#line4')
      // .attr('y', 8)
      // .attr('dy', '3.72em')
      .text(d => d.data.lines[3])
      .attr('fill-opacity', 1)

    var nodeExit = node.exit().transition()
      .duration(duration)
      .remove()
      .attr("transform", d => `translate(${source.x},${source.y})`) // d.parent.x, d.parent.y to toggle to root

    nodeExit.select('rect.node')
      .attr('width', 1e-6)
      .attr('height', 1e-6);

    nodeExit.select('.nodeText')
      .style('fill-opacity', 1e-6)

    descendants.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });


    // ****** Ancestors ****
    // var ancestor = baseSvg.selectAll('#ancestor_container.ancestor').data(ancestors)
    //
    // ancestorEnter = ancestor.enter()
    // .append('rect')
    //   // .attr('x',10)
    //   // .attr('y',10)
    //   // .attr('rx', 6)
    //   // .attr('ry', 6)
    //   .attr('width',tabWidth)
    //   .attr('height',tabHeight)
    //   .attr('border',1)
    //   .style('stroke','black')
    //   .style('fill','red')
    //   .attr('x', function(d, i) {
    //     console.log(i * tabWidth)
    //     i * tabWidth
    //   })
    //
    //   ancestorUpdate = ancestor.merge(ancestorEnter)
    //     .transition()
    //     .duration(duration)
    //     .attr('x', function(d, i) {
    //       i * tabWidth
    //     })
    //
    //
    //
    //   ancestorExit = ancestor.exit()
    //     .transition()
    //     .duration(duration)
    //     .remove();
  }

  // console.log("Current Root = ", localRoot)//, " and source = ", source);

  // function hideChildren(d)
  // {
  //   console.log(d);
  //
  //   for(i=0;i<hidden_tabs.length;i++)
  //   {
  //     if(d==hidden_tabs[i])
  //     {
  //       d._links = d.links
  //       d.links = null;
  //     }
  //   }
  //   drawTree(window.currentRoot);
  //
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
    drawTree(window.currentRoot);
  }
