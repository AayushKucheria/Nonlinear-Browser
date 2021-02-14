 const margin = { top: 20, right: 100, bottom: 100, left: 100};
window.tabWidth = 200;
const tabHeight = 80;
const duration = 750;
var innerWidth = window.innerWidth - margin.left - margin.right;
var innerHeight = window.innerHeight - margin.top - margin.bottom;
var currentZoom = 1;
var currentPos = {x: 0, y: 0}
window.fontSize = 16;
window.currentRoot;
var iconWidth = tabWidth/4;
var iconHeight = tabHeight/3;
var feOffset;
var selectedNode = null;
var draggingNode = null;
var panSpeed=200;
var panBoundary=20;
var currentTransform;
var allLinks;
var allDescendants;
var animationDuration = 500
var newElement;
var tree_dict = {};
var gotoChecker = false;
var clickFlag;
var dragCommenced = false;



treeLayout = d3.tree()
  .nodeSize([tabWidth, tabHeight])
  .separation(function(a, b) { return 1.5})

// d3.select('body').style('fill-color', '#f5f5f5')

// For checking length of text for wrapText
var div = d3.select("rect").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

//resize
var baseDiv = d3.select('body').append('div')
  .classed('svg-container', true)

var baseSvg = baseDiv.append('svg')
  .attr("preserveAspectRatio", "xMinYMin meet")
  .classed("svg-content-responsive", true)
  // .classed('svg-container', true)
  .attr('viewBox', d => "" + (tabWidth - innerWidth)/2 + " " + (tabHeight-innerHeight)/4 + " " + innerWidth + " " + innerHeight)

// baseSvg.append('rect')
//   .attr('class', 'overlay')
//   .attr('width', '100%')
//   .attr('height', '100%')
//   .style('fill', 'white')

var g = baseSvg.append('g')
  .attr('id', 'treeContainer')
  .on("mouseover", function(d) {
    d3.select(this).style("cursor","pointer"); // TODO arunima
  })

// g.append("rect")
//     .attr("class", "overlay")
//     .attr("width", innerWidth)
//     .attr("height", innerHeight);

//Define the drag listener for drag/drop behaviour of nodes.
var dragListener = d3.drag()
        .on("start", function(e,d) { //on mousedown
          console.log("start")
          if( d === window.currentRoot) return;

          dragCommenced = true;


          e.sourceEvent.stopPropagation();// suppress the mouseover event on the node being dragged
        })
        .on("drag", function(e,d) {//mouse-move
          console.log("Drag");
          clickFlag=true;
          // console.log("clickFlag", clickFlag)
          d3.select(this).lower();

          d3.selectAll(this).select('rect').transition().duration(animationDuration)
          .style("filter" , "url(#drop-shadow)") //shadow while dragging

          floater(); //shadow transition effect
          if(d === window.currentRoot) return;

          if(dragCommenced) {
            initiateDrag(d, this);
          }


          var relCoords = d3.pointer(e);
          d.x0 =  d.x0 + e.dx;
          d.y0 =  d.y0 + e.dy;
          d3.select(this).attr("transform", "translate(" + d.x0 + "," + d.y0 +")");
        })
        .on("end", function(e,d) {
          // mouse up/release

          console.log("end", clickFlag)

          if(clickFlag) {
            // console.log("adfadfda")
            clickFlag = false;
            dragCommenced = false;
            d3.select(this).select('rect').transition().duration(animationDuration)
              .style('filter', 'unset')// stop shadow after having dragged

            if(d == window.currentRoot) return;

            if(selectedNode && selectedNode != draggingNode) {
               // The node hovered upon
               console.log("end console logging")
              // Not getting updated in data?? TODO
              let oldParent = d.parent.data;
              d.data.parentId = selectedNode.data.id; // Update parentId
              oldParent.children.splice(oldParent.children.indexOf(d.data), 1); // Remove from previous parent
              selectedNode.data.children.push(d.data); // Add to new parent
              console.log(window.localRoot);
              updateTree(window.localRoot);

              endDrag(d, this, true);
            }
            else {
              endDrag(d, this, false);
            }
          }
          else {
            openTab(d.data)
          }
      });

var defs = g.append("defs");

  // Drop shadow
  var filter = defs.append("filter")
      .attr("id", "drop-shadow")

  filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 5)
      .attr("result", "blur");
  feOffset= filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 4)
      .attr("dy", 4)
      .attr("result", "offsetBlur");

  var feMerge = filter.append("feMerge");

  feMerge.append("feMergeNode")
      .attr("in", "offsetBlur")
  feMerge.append("feMergeNode")
      .attr("in", "SourceGraphic");

// Blur Tab text
var filter = defs.append("filter")
    .attr("id", "blur")

filter.append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", 2)
    .attr("result", "blur");

const zoomer = d3.zoom().scaleExtent([0.5, 1.5])
  .on("zoom", function(event,d){
     zoom(event)
 });

function wheeled(event,d) {

  if(event.deltaY>0) {
      currentZoom = Math.min(currentZoom * 1.5, 1.5);
  }

  else {
      currentZoom = Math.max(currentZoom * 0.5, 0.5);
   }
  //
  // if(event.ctrlKey && currentTransform.k>0) {
    // console.log("control being pressed")
    // currentTransform.k = currentTransform.k - event.deltaY*0.01;

    //
    g.transition().duration(750).attr('transform', 'translate(' + [currentPos.x, currentPos.y] + ')scale(' + currentZoom + ')')
    // //zoom in
    //
    // g.transition().duration(750).attr('transform', 'translate(' + [currentPos.x, currentPos.y] + ')scale(' + currentZoom + ')')
  }
    //zoom out
  // else {
  //   currentTransform.y = currentTransform.y - event.deltaY;
  // }
  // g.attr('transform',currentTransform)

  // .filter(function(event) {
  //   if(d3.event.ctrlKey)
  //     {
  //       console.log("logging control key")
  //       return true;
  //     }
  //     else {
  //       return false;
  //     }
  // })

baseSvg.call(zoomer)
  .on('wheel.zoom', null)
  .on('dblclick.zoom',null)
  .on('wheel', function(event, d) {
    if(event.ctrlKey)
    {
    console.log("event with ctrl key pressed", event);
    event.preventDefault();
    }
    zoom(event)}
    );

function zoom(event) {
  if(event.ctrlKey)
  {

    currentZoom += event.deltaY * -0.01;
    currentZoom = Math.min(Math.max(.5, currentZoom), 2);
  }

  else if(event.sourceEvent) { // mouse panning
    // console.log("Mouse panning ", event);
    currentPos.x = currentPos.x + event.sourceEvent.movementX * currentZoom;
    currentPos.y = currentPos.y + event.sourceEvent.movementY * currentZoom
  }
  else if(event.transform) { // Actual zoom
    console.log("Actual Zoom ", event);

    currentZoom = event.transform.k
    currentPos = {x: event.transform.x, y: event.transform.y}
  }
  else {
      currentPos.x = currentPos.x + event.wheelDeltaX * currentZoom
      currentPos.y = currentPos.y + event.wheelDeltaY * currentZoom
    // zoomer.translateBy(g, event.wheelDeltaX, event.wheelDeltaY);
  }
  g.attr('transform', 'translate(' + [currentPos.x, currentPos.y] + ')scale(' + currentZoom + ')')
}

function centerNode(source) {
  x = -source.x0;
  y = -source.y0;
  currentPos.x = x * currentZoom - tabWidth/2;
  currentPos.y = y * currentZoom - tabHeight/2;
  g.transition().duration(750).attr("transform", d => `translate(${currentPos.x}, ${currentPos.y})scale(${currentZoom})`)
}

var overCircle = function(d){
  selectedNode = d;
  // console.log("Updated selected node to ", selectedNode);
  updateTempConnector();
}

var outCircle = function(d){
  selectedNode = null;
  updateTempConnector();
}

// Function to update the temporary connector indicating dragging affiliation
var updateTempConnector = function() {
    var temp = [];
    if (draggingNode !== null && selectedNode !== null) {
        // have to flip the source coordinates since we did this for the existing connectors on the original tree
        temp = [{
            source: {
                x: selectedNode.y0,
                y: selectedNode.x0
            },
            target: {
                x: draggingNode.y0,
                y: draggingNode.x0
            }
        }];
    }
    var link = g.selectAll(".templink").data(temp);

    link.enter().append("path")
        .attr("class", "templink")
        .attr("d", function(d) {
          d3.linkVertical()
            .x(d.x)
            .y(d.y)
        })
        .attr('pointer-events', 'none');

    // link.attr("d", d3.svg.diagonal());

    link.exit().remove();
};

function initializeTree(localRoot) {
  root = d3.hierarchy(localRoot)
  root.x0 = innerWidth/2;
  root.y0 = innerHeight/2;
  window.currentRoot = root;
  drawTree(root);
  // centerNode(root);
}

function updateTree(localRoot) {
  window.currentRoot = d3.hierarchy(localRoot);
  drawTree(window.currentRoot)
// centerNode(window.currentRoot);
}

function delete_tab(node) {
  var parent = node.parent;
  parent.children = parent.children.filter(d => d != node);
  drawTree(window.currentRoot);
}

function drawTree(source) {
  // Fnon.Wait.Ripple('Loading tree');
  console.log("Drawing tree ", window.currentRoot);

  traverse(window.currentRoot,
    function(d) {
      if(d && !(d._children) && d.data.toggle && d.children) {
        d._children = d.children;
        d.children = null;
      }
    },
    function(d) {
      if(d.data.toggle) {
        return null
      }
      else {
        return d.children
      }
    })

    console.log("Root after toggle fiasco: ", window.currentRoot);
    const tree = treeLayout(window.currentRoot)
    const links = tree.links()
    allLinks = links;
    const descendants = tree.descendants()
    allDescendants = descendants;
    const ancestors = tree.ancestors();
    const linkPathGenerator = d3.linkVertical()
      .x(d => d.x + tabWidth/2)
      .y(d => d.parent? d.depth * 180 : d.depth * 180 + tabHeight)
    descendants.forEach(d => d.y = d.depth * 180)

    var menu = [
      {
        title: "Rename Tab",
        action: function(event,d,elem) {
          var result= prompt('Enter new name: ')
          if(result) {
            elem.data.title=result;
            elem.data.lines = wrapText(result)
            drawTree(window.currentRoot);
            // console.log("localRoot is", localRoot)
            document.title = window.localRoot.title;
            localStore(); // TODO
          }
        }
      },
      // {
      //   submenu
      // },
      {
        title: "Copy URL",
        action: function(event,d,elem) {
          console.log("just to check d",elem)
          var promise = navigator.clipboard.writeText(elem.data.url);
        }
      },
      {
        title: "Save Tree",
        action: function(event,d,elem) {
          saveTree(elem.data);
        }
      },
      {
        title: "Toggle read state",
        action: function(nodeEvent, choiceEvent, elem) {
          elem.data.read = elem.data.read ? false : true;
          updateStuff();
          localStore();
        }
      }
    ]







    // ** NODES ***
    var node = g.selectAll('g.node')
      .data(descendants, function(d) {
        return d.data.id;
      })

    var link = g.selectAll('path.link').data(links, function(d) {
      return d.target.data.id;
    });

    var nodeEnter, linkEnter, nodeUpdate, linkUpdate, nodeExit, linkExit;

    function enterStuff() {

      nodeEnter = node.enter().append('g')
        // .call(dragListener)
        .attr('class', 'node')
        .attr('id', function(d,i) {
          return d.data.id;
        })
        .attr('cursor', 'pointer')
        .on('contextmenu', function(event, d) {
          window.contextMenu(event, d, menu);
        })
        .on('mouseover', function(event, d) {
          overCircle(d);
          d3.select(this).select('rect').transition().duration(animationDuration)
            // Show tab border
            .style('stroke-opacity', 1)

          // Blur favicon to add text .selectAll('text, .favicon')
          d3.select(this).selectAll('.favicon').transition().duration(animationDuration).style("filter", "url(#blur)");

          // Show tool icons
          d3.select(this).selectAll('.icon').transition().duration(animationDuration).attr('opacity',1);

        })
        .on('mouseout', function(event, d) {

          d3.select(this).select('rect').transition().duration(animationDuration)
            // Hide tab border
            .style('stroke-opacity', 0)
            // Hide shadow TODO doesn't follow transition.
            .style('filter', 'unset');

          // Remove text blur
          d3.select(this).selectAll('.favicon').transition().duration(animationDuration).style('filter', 'unset');

          // Hide tool icons
          d3.select(this).selectAll('.icon').transition().duration(animationDuration).attr('opacity',0);

          // BUG this implementation causes the paths to fuck up.
          // Set active links to inactive again
          // g.selectAll(".link.active")
          //   .classed("active", false)
          //   .transition().duration(animationDuration).style('stroke', '#ccc');
        })
        .attr("transform",d => `translate(${source.x0},${source.y0})`)
        .call(dragListener)


      // Tab Rectangle
      nodeEnter.append('rect')
        .attr('class', 'node')
        .attr('width', tabWidth)
        .attr('rx', '10')
        .attr('ry', '10')
        .attr('height', tabHeight)
        .on('click', function(event,d) {
          openTab(d);
          // Get url of clicked tab
        })

      nodeEnter.append('circle')
        .attr('class', 'ghostCircle')
        .attr('radius', 200)
        .attr('opacity', 1)
        .style('fill', 'red')
          .attr('pointer-events', 'mouseover')
          .on('mouseover', function(e,node) {
            selectNode(node);
          })
          .on('mouseout', function(e,node) {
            deselectNode(node);
          })
        // Website Favicon
      nodeEnter.append('svg')
        .append('svg:image')
        .attr('class', 'favicon')
        .attr('xlink:href', d => d.data.favIconUrl ? d.data.favIconUrl : 'res/rabbit.svg')
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

        // Toggle Arrows

      // Toggle
      nodeEnter.append('svg')
        .append('svg:image')
        .attr('id', 'toggle')
        .attr('xlink:href', function(d) {
          if(d.children)
            return 'res/arrow-up-circle.svg';
          else if(d._children)
            return 'res/arrow-down-circle.svg';
        })
        .attr('class','toggle')
        .attr('x', tabWidth/2 - 20)
        .attr('y', tabHeight)
        .attr('width', iconWidth)
        .attr('height', iconHeight)
        .on('click', function(event,d) {
          toggleChildren(d)
          localStore(window.data);
        });

      // Delete Icon
      nodeEnter.append('svg')
        .append('svg:image')
        .attr('id','delete')
        .attr('xlink:href', function(d){
          if(!(d.data.id==='Root'))
          {
            return 'res/black-bin.svg';
          }
        })
        .attr('class','icon')
        .attr('x', (tabWidth - iconWidth)+40)
        .attr('y', 0)
        .attr('width', iconWidth)
        .attr('height', iconHeight)
        .attr('opacity',0)
        .on('click', function(event,d) {

          // console.log("yes fuck you")

          // Remove tab from browser
          chrome.tabs.remove(d.data.id);

          // Remove children from browser
          var removeChildren = d.data.children ? d.data.children : (d.data._children ? d.data._children : null)
          if(removeChildren != null)
          {
          removeTabs = removeChildren.map(child => child.id)
          chrome.tabs.remove(removeTabs);
          }

          // Logging
          console.log("Removed ", d, " and ", removeChildren, " from chrome.")
          // Remove subtree from nonlinear
          removeSubtree(d.data.id);
          // exitStuff();
          console.log("localRoot children: ", localRoot.children)
      });

      count = 0;
      linkEnter = link.enter().append('path') // or insert
        .attr('class', 'link')
    }

    function updateStuff() {
      var count = 0;
      nodeUpdate = nodeEnter.merge(node)
        .transition()
        .duration(duration)
        .ease(d3.easeBackOut) // p2
        .style('fill',function(d) {
          if(d.data.read) {
            return '#646b6d'; //gray
          }
          else if(d.data.deleted) {
            return '#ff0000'; //red
          }
          else {
            return '#21b3dc'; //blue
          }
        })
        .attr("transform",d => `translate(${d.x},${d.y})`)

      nodeUpdate.select('#line1')
        .text(d => d.data.lines[0])
        .attr('fill-opacity', 1)

      nodeUpdate.select('#line2')
        .text(d => d.data.lines[1])
        .attr('fill-opacity', 1)

      nodeUpdate.select('#line3')
        .text(d => d.data.lines[2])
        .attr('fill-opacity', 1)

      nodeUpdate.select('#line4')
        .text(d => d.data.lines[3])
        .attr('fill-opacity', 1)

      nodeUpdate.select('.favicon')
        .attr('xlink:href', d => d.data.favIconUrl ? d.data.favIconUrl : 'res/rabbit.svg')

      // TODO if toggled don't hide the icon: Visual indicator that children exist
      // TODO toggle is cancelled if we create a new tab. Save toggle property in node.
      nodeUpdate.select('#toggle')
        .attr('opacity', function(d) {
          if(d.children || d._children)
            return 1;
          else {
            return 0;
          }
        })
        .attr('xlink:href', function(d) {
          if(d.children)
            return 'res/arrow-up-circle.svg';
          else if(d._children)
            return 'res/arrow-down-circle.svg';
        })

      count = 0;
      linkUpdate = linkEnter.merge(link).transition()
        .duration(duration)
        .attr('d', function(d) {
          return linkPathGenerator(d);
        })
    }

    function exitStuff() {
      count = 0;
      nodeExit = node.exit()
        .attr('width', 1e-6)
        .attr('height', 1e-6)
        .remove();

      count = 0;
      linkExit = link.exit()
        .remove();
    }

    enterStuff();
    updateStuff();
    exitStuff();

    descendants.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
      d.data.x0 = d.x;
      d.data.y0 = d.y;
    });

  }


var dest_min = 2, dest_max = 10, dest = dest_min;

//Causes the shadow transition
var floater = function() {
  if(dest === dest_min) {
    dest = dest_max;
  }
  else {
    dest = dest_min;
  }
  feOffset.transition()
          .duration(600)
          .attr("dx", dest)
          .attr("dy", dest)
          .on("end", floater)
}

  function initiateDrag(d, domNode) {
    draggingNode = d; // global variable
    // d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
    // d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');

    d3.select(domNode).attr('class', 'node activeDrag');

    // Remove connected paths
    g.selectAll("path.link")
      .data(allLinks)
      .filter(function(de) {
         return de.target.data.id === d.data.id || de.source.data.id === d.data.id
      }).remove();

    // Remove this node's descendants
    g.selectAll('.node')
      .data(d.descendants(), de => de.data.id)
      .filter(function(de) {
        if(d.data.id === de.data.id)
          return false;
        return true;
      })
      .remove();

    // Drag completed
    dragCommenced = false;
  }

  function endDrag(d, domNode, onNode) {
    selectedNode = null;
    d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
    d3.select(domNode).attr('class','node');

    // restoring the mouseover event or we cannot drag it a 2nd time
    d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
    //updateTempConnector();
    if(draggingNode !== null){
      //update(root);
      // centerNode(draggingNode);
      drawTree(window.currentRoot);
      draggingNode = null;
      localStore();
    }
  }


// function checkToggle() {
//   traverse(window.currentRoot,
//   function(d) {
//     if(d.data.toggle) {
//       toggleChildren(d)
//     }
//   },
//   function(d) {
//     if(d.data.toggle)
//       return null;
//     else
//       return d.children
//   })
// }
function toggleChildren(d) {
  console.log("Data before toggle: ", d);
  if(d.children) {

    d.data.toggle = true;
    d._children = d.children;
    d.children = null;
    console.log("Data after toggle: ", d);
  }
  else if(d._children) {
    d.data.toggle = false;


    d.children = d._children;
    d._children = null;
  }
  drawTree(d);
}

document.querySelector('#centerTree').onclick = function(e) {
  centerNode(window.currentRoot);
}
document.querySelector('#zoomIn').onclick = function(e) {
  currentZoom = Math.min(currentZoom * 1.5, 1.5);

  g.transition().duration(750).attr('transform', 'translate(' + [currentPos.x, currentPos.y] + ')scale(' + currentZoom + ')')
}
document.querySelector('#zoomOut').onclick = function(e) {
  currentZoom = Math.max(currentZoom * 0.5, 0.5);
  g.transition().duration(750).attr('transform', 'translate(' + [currentPos.x, currentPos.y] + ')scale(' + currentZoom + ')')}


document.querySelectorAll('.drop').forEach(item => {
  //item is the actual heading

  // console.log("item is", item)


  item.onmouseover = function() {
  // ; //subelement defined under item
    // console.log("current root", window.localRoot)
    this.querySelectorAll('.dropdown').forEach(elem => elem.style.display = "block");
  }


  item.onmouseleave = function() {
    this.querySelectorAll('.dropdown').forEach(elem => elem.style.display = "none");
  }
});


function openTab(tab) {

  chrome.tabs.query({'url': tab.data.url}, function(tabs) {
    // If exists
    if(tabs.length > 0) {
      // Focus on that tab and its window
      chrome.tabs.update(tabs[0].id, {
        active: true
      });
      chrome.windows.update(tabs[0].windowId, {
      focused: true
      });
    }
    else { // Create tab with this url
      var newTab = {
        // 'openerTabId': parseInt(d.data.parentId), // For saved trees this var is string, converting with parseInt doesn't work.
        'url': tab.data.url,
      }
      chrome.tabs.create(newTab);
    }
  })
}
