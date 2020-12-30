
const margin = { top: 20, right: 20, bottom: 20, left: 20};
window.tabWidth = 200;
const tabHeight = 80;
const duration = 750;
var innerWidth = window.innerWidth - margin.left - margin.right;
var innerHeight = window.innerHeight - margin.top - margin.bottom;
var currentZoom = 1;
var currentPos = {x: 0, y: 0}
window.fontSize = 16;
window.currentRoot;

treeLayout = d3.tree()
  .nodeSize([tabWidth, tabHeight])
  .separation(function(a, b) { return 1.5})

d3.select('body').style('background', 'url(res/dot-grid.svg)')

// For checking length of text for wrapText
var div = d3.select("rect").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

var baseDiv = d3.select('body').append('div')
  .classed('svg-container', true)

var ancestorSvg = baseDiv.append('svg')
  .attr("preserveAspectRatio", "xMinYMin meet")
  .classed("svg-content-responsive", true)
  .attr('viewBox', d => "" + margin.left + " " + margin.top + " " + innerWidth + " " + 3*tabHeight/2)

var a = ancestorSvg.append('g')
  .attr('id', 'ancestorContainer')
  // .attr("transform",d => `translate(40,40)`)
  // .attr('x', margin.left + 20)
  // .attr('y', margin.top + 20)

var baseSvg = baseDiv.append('svg')
  .attr("preserveAspectRatio", "xMinYMin meet")
  .classed("svg-content-responsive", true)
  .attr('viewBox', d => "" + (tabWidth - innerWidth)/2 + " " + (tabHeight-innerHeight)/4 + " " + innerWidth + " " + innerHeight)

// baseSvg.append('rect')
//   .attr('width', '100%')
//   .attr('height', '100%')
//   .style('fill', 'white')

var g = baseSvg.append('g')
  .attr('id', 'treeContainer')
  .on("mouseover", function(d) {
  d3.select(this).style("cursor","pointer");
  })


const zoom = d3.zoom().scaleExtent([0.5, 1.5])
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
  console.log("Calling centerNode")
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

function delete_tab(node) {
  var parent = node.parent;
  parent.children = parent.children.filter(d => d != node);
  drawTree(window.currentRoot);
}

function add_tab() {

}

function drawTree(source) {


    const tree = treeLayout(window.currentRoot)
    const links = tree.links()
    const descendants = tree.descendants()
    const ancestors = tree.ancestors();
    const linkPathGenerator = d3.linkVertical()
      .x(d => d.x + tabWidth/2)
      .y(d => d.parent? d.depth * 180 : d.depth * 180 + tabHeight)
    descendants.forEach(d => d.y = d.depth * 180)

    // console.log("Ancestors: ", ancestors);

    var menu = [
      {
        title: "Go to tab",
        action: function(event, elem) {
          // console.log("window.localRoot",window.localRoot)
          // console.log("what is elem",elem)
          if(!(elem.data===window.localRoot))
          {
          // console.log("Clicked on go to tab for ", elem);
          chrome.tabs.update(elem.data.id, {
            active: true
          });
          chrome.windows.update(elem.data.windowId, {
            focused: true
          });
        }
        else {
          console.log("aa bhi raha hai kya")
          visible:false;
            }
        }
      },
      {
        title: "Toggle",
        action: function(event, elem) {
          console.log("Context toggle: ", elem)
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
          // delete_node(elem); TODO ?
        }
      },
      {
        title: "Hide the hidden tabs",
        action: function(event, elem) {
          hide(elem,0);
        }
      },
      {
        title: "Show the hidden tabs",
        action: function(event,elem) {
          hide(elem,1);
        }
      },
      {
        title: "Select hidden tabs",
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
    var ancestor = a.selectAll('g.ancestor').data(ancestors, function(d) {
      return d.data.id;
    })
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

    // console.log("AncestorEnter = ", ancestorEnter)
    // console.log("AncestorUpdate = ", ancestorUpdate)

    // ******* LINKS ******
    var link = g.selectAll('path.link').data(links, function(d) {
      return d.target.data.id;
    })// Links join tree.links()

    var linkEnter = link.enter().append('path') // or insert
      .attr('class', 'link')
      .transition()
      .duration(duration)
        .attr('d', linkPathGenerator)
      // .attr('toggle', 'false') // It's entered, so it's not toggled.
      // .attr('stroke-opacity', 1);

    // link.merge(linkEnter)
    link.transition()
      .duration(duration)
      .attr('d', linkPathGenerator);
      // .attr('stroke-opacity', 1);

    var linkExit = link.exit()
      .transition()
      .duration(duration)
      .attr('d', d => linkPathGenerator({source: source, target: source}))
      .attr('stroke-opacity', 1e-6)
      .remove();


    // **** NODES *****
    var node = g.selectAll('g.node')
      .data(descendants, function(d) {
        console.log(d.data.id);
        return d.data.id;
      })

    function getTranslation(transform) {
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttributeNS(null, "transform", transform);
      var matrix = g.transform.baseVal.consolidate().matrix;
      return [matrix.e, matrix.f];
    }


    var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('fill-opacity', 1)
      .attr('stroke-opacity', 1)
      .attr('id', function(d,i)
      { return d.data.id;
      })
      .attr("transform",d => `translate(${source.x0},${source.y0})`)
      .attr('cursor', 'pointer')
      .on('contextmenu', function(event, d) {
        window.contextMenu(event, d, menu);
      })
      .style('font-size', window.fontSize)
      .style('font-weight', 400)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .select('rect').style('stroke-opacity', 1);
        d3.select(this)
          .selectAll('.icon').attr('opacity',1);
        g.selectAll(".link").classed("active", function(p) { return p.target === d; }); // Add p.source === d to highlight children path too
        g.selectAll(".link.active").style('stroke', 'black');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
        .select('rect').style('stroke-opacity', 0);
        d3.select(this)
        .selectAll('.icon').attr('opacity',0);
        g.selectAll(".link.active")
          .classed("inactive", true)
          .style('stroke', '#ccc');
      })

    // Tab Rectangle
    nodeEnter.append('rect')
      .attr('class', 'node')
      .attr('width', tabWidth)
      // .attr('rx', '10')
      // .attr('ry', '10')
      .attr('fill', '#97d0ef')
      .attr('height', tabHeight)
      .style('stroke', 'steelblue')
      .style('stroke-opacity', 0)


    // Website Favicon
    nodeEnter.append('svg')
      .append('svg:image')
      .attr('class', 'favicon')
      .attr('xlink:href', d => d.data.favIconUrl)
      .attr('dy', '1em')
      .attr('width', tabWidth/5)
      .attr('height', tabHeight/3)

    // =========== Tab title
    nodeEnter.append('text')
      .attr('id', 'line1')
      .attr('class', 'nodeText')
      .attr('dx', "2.5em")
      .attr('dy', '1em')
      .text(d => d.data.lines[0])
      .attr('fill-opacity', 1)

    nodeEnter.append('text')
      .attr('id', 'line2')
      .attr('class', 'nodeText')
      .attr('dx', "2.5em")
      .attr('dy', '2em')
      .text(d => d.data.lines[1])
      .attr('fill-opacity', 1)

    nodeEnter.append('text')
      .attr('id', 'line3')
      .attr('class', 'nodeText')
      .attr('dx', "0.5em")
      .attr('dy', '3em')
      .text(d => d.data.lines[2])

    nodeEnter.append('text')
      .attr('id', 'line4')
      .attr('class', 'nodeText')
      .attr('dx', "0.5em")
      .attr('dy', '4em')
      .text(d => d.data.lines[3])

    // ====== Comment Bubble
    // nodeEnter.append('svg')
    //   .append('svg:image')
    //   .attr('xlink:href', 'res/comment_bubble.svg')
    //   .attr('x', 0.95*tabWidth)
    //   .attr('y', 0.75 * tabHeight)
    //   .attr('width', tabWidth/5)
    //   .attr('height', tabHeight/4)

      // ====== Toggle Arrows
      // nodeEnter.append('svg')
      //   .append('svg:image')
      //   .attr('id', 'arrow-up')
      //   .attr('xlink:href', 'res/arrow-up-circle.svg')
      //   .attr('x', tabWidth/2)
      //   .attr('y', tabHeight)
      //   .attr('width', tabWidth/5)
      //   .attr('height', tabHeight/4)
      //   .attr('display', function(d) {
      //     if(d.children)
      //       return 'unset';
      //     else
      //       return 'none';
      //   })
      //   .on('click', function(event,d) { toggleChildren(d)});
      //
      // nodeEnter.append('svg')
      //   .append('svg:image')
      //   .attr('id', 'arrow-down')
      //   .attr('xlink:href', 'res/arrow-down-circle.svg')
      //   .attr('x', tabWidth/2)
      //   .attr('y', tabHeight)
      //   .attr('width', tabWidth/5)
      //   .attr('height', tabHeight/4)
      //   .attr('display', function(d) {
      //     if(d._children)
      //       return 'unset';
      //     else
      //       return 'none';
      //   })
      //   .on('click', function(event,d) { toggleChildren(d)});


        nodeEnter.append('svg')
      .append('svg:image')
      .attr('xlink:href', 'res/comment_bubble.svg')
      .attr('x', 0.95*tabWidth)
      .attr('y', 0.75 * tabHeight)
      .attr('class','icon')
      .attr('x', 0.96*tabWidth)
      .attr('y', 0.4005 * tabHeight)
      .attr('width', tabWidth/5)
      .attr('height', tabHeight/4)
      .attr('opacity',0)
    //   .attr('mouseover', function(d)
    // {
    //   d3.select(this).attr('opacity',1)
    // })
    //   .attr('mouseout', function(d)
    // {
    //   d3.select(this).attr('opacity',0)
    // })

      // ====== Toggle Arrows
      nodeEnter.append('svg')
        .append('svg:image')
        .attr('id', 'arrow-up')
        .attr('xlink:href', 'res/arrow-up-circle.svg')
        .attr('class','icon')
        .attr('x', tabWidth/2)
        .attr('y', tabHeight)
        .attr('width', tabWidth/5)
        .attr('height', tabHeight/4)
        .attr('display', function(d) {
          if(d.children)
            return 'unset';
          else
            return 'none';
        })
        .on('click', function(event,d) { toggleChildren(d)});

      nodeEnter.append('svg')
        .append('svg:image')
        .attr('id', 'arrow-down')
        .attr('xlink:href', 'res/arrow-down-circle.svg')
        .attr('class','icon')
        .attr('x', tabWidth/2)
        .attr('y', tabHeight)
        .attr('width', tabWidth/5)
        .attr('height', tabHeight/4)
        .attr('display', function(d) {
          if(d._children)
            return 'unset';
          else
            return 'none';
        })
        .on('click', function(event,d) { toggleChildren(d)});

        nodeEnter.append('svg')
        .append('svg:image')
        .attr('id','cross')
        .attr('xlink:href', 'res/close.svg')
        .attr('class','icon')
        .attr('x', 0.96*tabWidth)
        .attr('y', 0)
        .attr('width', tabWidth/5)
        .attr('height', tabHeight/4)
        .attr('opacity',0)
        // .on('mouseover', function(d)
        // {
        // d3.select(this).attr('opacity',1)
        // })
        // .on('mouseout', function(d)
        // {
        // d3.select(this).attr('opacity',0)
        // })
        .on('click', function(event,d) { chrome.tabs.remove(d.data.id)});


        nodeEnter.append('svg')
        .append('svg:image')
        .attr('id','hide')
        .attr('xlink:href','res/eye-crossed.svg')
        .attr('class','icon')
        .attr('x',0.96*tabWidth)
        .attr('y',0.8*tabHeight)
        .attr('width', tabWidth/5)
        .attr('height', tabHeight/4)
        .attr('opacity',0)
      //   .attr('mouseover',function(d)
      //   {
      //   d3.select(this).attr('opacity',1)
      //   })
      //   .on('mouseout', function(d)
      //   {
      //   d3.select(this).attr('opacity',0)
      //   })
        .on('click', function(event,d) { hide(d,0)});

      nodeEnter.append('svg')
      .append('svg:image')
      .attr('id','rename')
      .attr('xlink:href', 'res/edit.svg')
      .attr('class','icon')
      .attr('x',0)
      .attr('y',0.8*tabHeight)
      .attr('width', tabWidth/5)
      .attr('height', tabHeight/4)
      .attr('opacity',0)
      .on('click', function(event,elem)
    {
      var result= prompt('Change the name of the tab',elem.name)
      if(result)
      {
        elem.data.lines=[]
        elem.data.title=result;
        if(elem.data.title.length<10)
        {
          elem.data.lines[0]=elem.data.title;
        }
        else if(elem.data.title.length<20)
        {
          elem.data.lines[0]=elem.data.title.substring(0,10);
          rem= elem.data.title.substring(10,20);
          elem.data.lines[1]=rem;
        }
        else
        {
          elem.data.lines[0]=elem.data.title.substring(0,10);
          rem= elem.data.title.substring(10,20);
          elem.data.lines[1]=rem;
          sum= elem.data.lines[0].concat(elem.data.lines[1]);
          diff= elem.data.title.length - sum.length;
          elem.data.lines[2]= elem.data.title.substring(20,20+diff)
        }

        d3.select(this).attr('id', function(d)
        {
          return d.data.id;
        }).append('text')
        .attr('id', 'line1')
        .attr('class', 'nodeText')
        .attr('dx', "2.5em")
        .attr('dy', '1em')
        .text(d => elem.data.lines[0])
        .attr('fill-opacity', 1)

        d3.select(this).attr('id', function(d)
        {
          return d.data.id;
        }).append('text')
        .attr('id', 'line2')
        .attr('class', 'nodeText')
        .attr('dx', "2.5em")
        .attr('dy', '2em')
        .text(d => elem.data.lines[1])
        .attr('fill-opacity', 1)

        d3.select(this).attr('id', function(d)
        {
          return d.data.id;
        })
        .append('text')
        .attr('id', 'line3')
        .attr('class', 'nodeText')
        .attr('dx', "0.5em")
        .attr('dy', '3em')
        .text(d => d.data.lines[2])
      //
      // nodeEnter.append('text')
      //   .attr('id', 'line4')
      //   .attr('class', 'nodeText')
      //   .attr('dx', "0.5em")
      //   .attr('dy', '4em')
      //   .text(d => d.data.lines[3])
      //   d3.select(this).attr('id', function(d)
      // {
      //   return d.data.id;
      // }).append('text', elem.data.title);
      console.log(elem);
      drawTree(localRoot);
      //console.log()
      }
    });

      nodeEnter.append('svg')
      .append('svg:image')
      .attr('id','rename')
      .attr('xlink:href', 'res/anchor.svg')
      .attr('class','icon')
      .attr('x',0)
      .attr('y',0)
      .attr('width', tabWidth/5)
      .attr('height', tabHeight/4)
      .attr('opacity',0)
      .on('click', function(event,d)
    {
      setAsRoot(d);
      centerNode(window.currentRoot);
    })


    // var commentBubble = nodeEnter.append('foreignObject')
    //   .attr('class', 'commentBubble')
    //   .attr('width', 120)
    //   .attr('height', 60)
    //   .attr('x', tabWidth)
    //   .attr('y', -tabHeight/2)
    //   .attr('rx', '20')
    //   .attr('ry', '20')
    //   .style('opacity', '0')
    //   .append("xhtml:div")
    //   .html("<input type='text' placeholder='Add your comments here!'></input>")
    //   .on('click', function(event, d) {d3.select(this).style('opacity', '1')})
    //   .on('mouseover', function(event, d) {d3.select(this).style('opacity', '1')})
    //   .on('mouseout', function(event, d) {d3.select(this).style('opacity', '0')})


    // nodeEnter.append('rect')
    //   .attr('class', 'commentHover')
    //   .attr('width', 20)
    //   .attr('height', 10)
    //   .attr('x', tabWidth - 10)
    //   .attr('rx', '20')
    //   .attr('ry', '20')
    //   .on('mouseover', function(event, d) {
    //     var nodeSelection = d3.select(this.parentNode)
    //     nodeSelection.select('.commentBubble').style('opacity', '1')
    //   })
    //   .on('mouseout', function(event, d) {
    //     setTimeout(() => {
    //       var nodeSelection = d3.select(this.parentNode)
    //       nodeSelection.select('.commentBubble').style('opacity', '0');},
    //       2000)
    // })
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

    nodeUpdate.select('#arrow-up')
      .attr('display', function(d) {
        if(d.children)
          return 'unset';
        else
          return 'none';
      })

    nodeUpdate.select('#arrow-down')
      .attr('display', function(d) {
        if(d._children)
          return 'unset';
        else
          return 'none';
      })


    var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", d => `translate(${source.x},${source.y})`) // d.parent.x, d.parent.y to toggle to root
      .remove();


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

  function rename_node(nodex)
  {
    x= nodex.
    nodex.append('text')
      .attr('id', 'line1')
      .attr('class', 'nodeText')
      .attr('dx', "2.5em")
      .attr('dy', '1em')
      .text(d => d.data.lines[0])
      .attr('fill-opacity', 1)

    nodex.append('text')
      .attr('id', 'line2')
      .attr('class', 'nodeText')
      .attr('dx', "2.5em")
      .attr('dy', '2em')
      .text(d => d.data.lines[1])
      .attr('fill-opacity', 1)

    nodex.append('text')
      .attr('id', 'line3')
      .attr('class', 'nodeText')
      .attr('dx', "0.5em")
      .attr('dy', '3em')
      .text(d => d.data.lines[2])

    nodex.append('text')
      .attr('id', 'line4')
      .attr('class', 'nodeText')
      .attr('dx', "0.5em")
      .attr('dy', '4em')
      .text(d => d.data.lines[3])
  }




  function toggleChildren(d) {
    if(d.children) {
      d._children = d.children;
      d.children = null;
      d.toggle = true;
    }
    else if(d._children) {
      d.children = d._children;
      d._children = null;
      d.toggle = false;

    }
    console.log("Toggle switched to ", d.toggle)
    drawTree(d);
  }
