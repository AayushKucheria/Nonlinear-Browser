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
        .on("start", function(e,d) {

          // if(d3.drag().clickDistance(10))
          // {
          //   console.log("chaa gaya start")
          // }
           //drag initiated
          if( d === window.currentRoot) return;

          dragStarted=true;

          e.sourceEvent.stopPropagation();// suppress the mouseover event on the node being dragged
        })
        .on("drag", function(e,d) {

          // var parent = this.parentNode;

          // console.log("this", this)

          d3.select(this.parentNode).lower();

          d3.select(this.parentNode).select('rect').transition().duration(animationDuration)
          .style("filter" , "url(#drop-shadow)") //shadow while dragging

          floater(); //shadow transition effect
          if(d === window.currentRoot) return;

          if(dragStarted) {
            initiateDrag(d, this.parentNode);
          }

          var relCoords = d3.pointer(e);
          d.x0 =  d.x0 + e.dx;
          d.y0 =  d.y0 + e.dy;
          d3.select(this.parentNode).attr("transform", "translate(" + d.x0 + "," + d.y0 +")");
          // console.log("yes", d3.select(this).attr("transform"))
        })
        .on("end", function(e,d) {

          // gotoChecker = true;


          d3.select(this.parentNode).select('rect').transition().duration(animationDuration)
            .style('filter', 'unset')// stop shadow after having dragged

          if(d == window.currentRoot) return;

          if(selectedNode && selectedNode != draggingNode) { // The node hovered upon
            // Not getting updated in data?? TODO
            let oldParent = d.parent.data;
            d.data.parentId = selectedNode.data.id; // Update parentId
            oldParent.children.splice(oldParent.children.indexOf(d.data), 1); // Remove from previous parent
            selectedNode.data.children.push(d.data); // Add to new parent
            console.log(window.localRoot);
            updateTree(window.localRoot);

            endDrag(d, this.parentNode, true);
          }
          else {
            endDrag(d, this.parentNode, false);
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

  // if(event.ctrlKey)
  // {
  //   console.log("sfojsifj", event)
  // }
  // // console.log("wheel event")
  // // currentTransform = d3.zoomTransform(d);
  // // console.log("currentTransform", currentTransform)
  // // console.log("currentTransform.k", currentTransform.k)
  // console.log("event", event)

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
  // console.log("Drawing tree ", window.currentRoot);
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
          let res = nodeEvent.srcElement;//.parentNode;

          console.log("elem is", elem)
          // This sounds the opposite but works for some reason. :\
          if(elem.data.read) {
            elem.data.read = false;
            d3.select(res).attr('fill', '#21b3dc');
          }
          else {
            elem.data.read = true;
            d3.select(res).attr('fill', '#646b6d')
          }
          localStore();
        }
      }
    ]








    // ** NODES ***
    var node = g.selectAll('g.node')
      .data(descendants, function(d) {
        // if(d.data.toggle)
        // {
        //   toggleChildren(d);
        // }
        return d.data.id;
      })

    function getTranslation(transform) {
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttributeNS(null, "transform", transform);
      var matrix = g.transform.baseVal.consolidate().matrix;
      return [matrix.e, matrix.f];
    }


    var nodeEnter = node.enter().append('g')
      .style('fill',function(d) {

      if(d.data.read == false) {
        return '#21b3dc';
      }
      else {
        return '#646b6d';
      }
    })
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
        // selectNode(d);
        //selectedNode = d;
        d3.select(this).select('rect').transition().duration(animationDuration)
          // Show tab border
          .style('stroke-opacity', 1)
          // Display Shadow
        // TODO Doesn't follow transition..
          // .style("filter", "url(#drop-shadow)")
          ;

        // Blur text and favicon
        d3.select(this).selectAll('text, .favicon').transition().duration(animationDuration).style("filter", "url(#blur)");

        // Show tool icons
        d3.select(this).selectAll('.icon').transition().duration(animationDuration).attr('opacity',1);

        // floater();

        // BUG this implementation causes the paths to fuck up.
        // Set connected links as active
        // g.selectAll(".link").classed("active", function(p) { return (p.target === d || p.source === d); });
        // Highlight active links
        // g.selectAll(".link.active").transition().duration(animationDuration).style('stroke', 'black');
      })
      .on('mouseout', function(event, d) {

        d3.select(this).select('rect').transition().duration(animationDuration)
          // Hide tab border
          .style('stroke-opacity', 0)
          // Hide shadow TODO doesn't follow transition.
          .style('filter', 'unset');

        // Remove text blur
        d3.select(this).selectAll('text, .favicon').transition().duration(animationDuration).style('filter', 'unset');

        // Hide tool icons
        d3.select(this).selectAll('.icon').transition().duration(animationDuration).attr('opacity',0);

        // BUG this implementation causes the paths to fuck up.
        // Set active links to inactive again
        // g.selectAll(".link.active")
        //   .classed("active", false)
        //   .transition().duration(animationDuration).style('stroke', '#ccc');
      })
      .attr("transform",d => `translate(${source.x0},${source.y0})`)


    // Tab Rectangle
    nodeEnter.append('rect')
    //   {
    //     if(d.data.parent.id === "Root")
    //   {
    //     return "block";
    //   }
    //   }
    //   else {
    //     return "none";
    //   }
    // })
      .attr('class', 'node')
      .attr('width', tabWidth)
      .attr('rx', '10')
      .attr('ry', '10')
      .attr('height', tabHeight)
      .call(dragListener)

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

    // ====== Comment Bubble
    // nodeEnter.append('svg')
    //   .append('svg:image')
    //   .attr('xlink:href', 'res/comment_bubble.svg')
    //   .attr('x', 0.95*tabWidth)
    //   .attr('y', 0.75 * tabHeight)
    //   .attr('class','icon')
    //   .attr('x', 0.96*tabWidth)
    //   .attr('y', 0.4005 * tabHeight)
    //   .attr('width', tabWidth/5)
    //   .attr('height', tabHeight/4)
    //   .attr('opacity',0)
    // //   .attr('mouseover', function(d)
    // // {
    // //   d3.select(this).attr('opacity',1)
    // // })
    // //   .attr('mouseout', function(d)
    // // {
    // //   d3.select(this).attr('opacity',0)
    // // })

      // Toggle Arrows
    nodeEnter.append('svg')
      .append('svg:image')
      .attr('id', 'toggle')
      .attr('xlink:href', function(d) {
        if(d.children)
          return 'res/arrow-up-circle.svg';
        else if(d._children)
          return 'res/arrow-down-circle.svg';
      })
      .attr('class','icon')
      .attr('x', tabWidth/2 - 20)
      .attr('y', tabHeight)
      .attr('width', iconWidth)
      .attr('height', iconHeight)
      .attr('opacity',0)
      .on('click', function(event,d) {
        toggleChildren(d)
        localStore(window.data);});


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
        console.log("localRoot children: ", localRoot.children)
    });

    nodeEnter.append('svg')
      .append('svg:image')
      .attr('id','go')
      .attr('xlink:href', function(d)
      {
        // console.log('d', d)
        if(!(d.data.id === 'Root'))
        {
        return 'res/arrow-right-top.svg';
        }
      })
      .attr('class','icon')
      .attr('x', tabWidth - iconWidth + 40)
      .attr('y', tabHeight - iconHeight)
      .attr('width', iconWidth)
      .attr('height', iconHeight)
      .attr('opacity',0)
      .on('click', function(event,d) {

        // Get url of clicked tab
      chrome.tabs.query({'url': d.data.url}, function(tabs) {
        console.log("Tabs with this url in chrome: ", tabs);

        // If exists
        if(tabs.length > 0) {
          console.log("Updating view to ", tabs[0])
          // Focus on that tab and its window
          chrome.tabs.update(tabs[0].id, {
            active: true
          });
          chrome.windows.update(tabs[0].windowId, {
          focused: true
          });
        }
        else { // Create tab with this url
          console.log("Creating new tab");
          var newTab = {
            'openerTabId': parseInt(d.data.parentId), // For saved trees this var is string, converting with parseInt doesn't work.
            'url': d.data.url,
          }
          chrome.tabs.create(newTab);
        };
      });
  });

  //   d3.selectAll('.node').attr('display', function(d)
  // {
  //   var flag = false;
  //   console.log("d", d)
  //   var ancestors = d.ancestors(); // get the ancestors which even include themselves
  //
  //
  //
  //   if(ancestors.length>1)
  //   {
  //   ancestors = ancestors.splice(0, 1);
  //   console.log("ancestors are", ancestors ,"for", d.data.title)
  //   ancestors.forEach((item, i) => {
  //     if(item.data.toggle === true)
  //     {
  //       flag= true;
  //       console.log("item which was toggled", item.data.toggle)
  //
  //     }
  //   })}
  //      // return 'block';
  //     // toggleChildren(d);
  //     // console.log("d not toggled", d)
  //     if(flag === false)
  //     {
  //       console.log("block")
  //     return 'block';
  //   }
  //   else {
  //     console.log("none")
  //     return 'none';
  //   }
  // })
        // // ============ HIDE tab
        // nodeEnter.append('svg')
        // .append('svg:image')
        // .attr('id','hide')
        // .attr('xlink:href','res/eye-crossed.svg')
        // .attr('class','icon')
        // .attr('x',0.96*tabWidth)
        // .attr('y',0.3*tabHeight)
        // .attr('width', tabWidth/5)
        // .attr('height', tabHeight/4)
        // .attr('display', function(d) {
        //   var parent = d3.select(this).select(function() {
        //     return this.parentNode.parentNode;
        //   });
        //   if(parent.attr('fill-opacity') === '1') {
        //     return 'unset';
        //   }
        //   else
        //     return 'none';
        //   })
        // .on('click', function(event,d) {
        //   var parent = d3.select(this).select(function()
        //   {
        //     return this.parentNode.parentNode;
        //   });
        //   console.log(parent);
        //   parent.attr('opacity',0);
        //   parent.attr('fill-opacity',0);
        //
        //   g.selectAll(".link").classed('hide_link', function(e)
        //   {
        //     return ((e.source == d)||(e.target == d))
        //   });
        //   g.selectAll(".link.hide_link").attr('opacity',0)
        //     .style('stroke-width',0)
        //     // .display('none')
        //   });
        //
        // // ============ SHOW tab
        // nodeEnter.append('svg')
        // .append('svg:image')
        // .attr('id','show')
        // .attr('xlink:href','res/eye.svg')
        // .attr('class','icon')
        // .attr('x',0.96*tabWidth)
        // .attr('y',0.3*tabHeight)
        // .attr('width', tabWidth/5)
        // .attr('height', tabHeight/4)
        // .attr('display', function(d) {
        //   var parent = d3.select(this).select(function() {
        //     return this.parentNode.parentNode;
        //   });
        //   console.log(parent.attr('fill-opacity') === '0')
        //   if(parent.attr('fill-opacity') === '0')
        //     return 'unset';
        //   else
        //     return 'none';
        //   })
        // .on('click', function(event,d) {
        //   var parent = d3.select(this).select(function()
        //   {
        //     return this.parentNode.parentNode;
        //   });
        //   parent.attr('fill-opacity',1);
        //   parent.attr('opacity',1);
        //
        //   g.selectAll(".link").classed('show_link', function(e)
        // {
        //   return ((e.source == d)||(e.target == d))
        // });
        //   g.selectAll(".link.show_link").attr('opacity',1)
        //     .style('stroke-width',1)
        //     // .display('none')
        // });

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
    // easeQuadOut
    //easeQuadInOut
    // easeCubicOut
    // easeCubicInOut
    // easePolyOut.exponent(2) // or inOut
    // easeSinOut // or inOut
    // easeElasticOut.amplitude(1).period(0.6)
    // easeBackIn when going to root, easeBackOut when coming from root
    var count = 0;
    // TODO Bad viz when a node with many children is toggled. The children ease at the start, but the other nodes replace them asap which makes it messy.
    var nodeUpdate = nodeEnter.merge(node)
      .transition()
      .duration(duration)
      // .delay(d => 100* count++)
      .ease(d3.easeBackOut) // p2
      .attr("transform",function(d)
      {
        `translate(${d.x},${d.y})`
      })
      //   console.log("d.data", d)
      //   if(d.data.toggle)
      //   {
      //     console.log("entering toggle function")
      //     toggleChildren(d);
      //   }
      // })


      // .attr('fill-opacity', 1);

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
      .attr('xlink:href', function(d) {
        if(d.children)
          return 'res/arrow-up-circle.svg';
        else if(d._children)
          return 'res/arrow-down-circle.svg';
      })

    // nodeUpdate.select('#hide')
    // .attr('display', function(d) {
    //   var parent = d3.select(this).select(function() {
    //     return this.parentNode.parentNode;
    //   });
    //   if(parent.attr('fill-opacity') === '1') {
    //     return 'unset';
    //   }
    //   else
    //     return 'none';
    //   })
    //
    // nodeUpdate.select('#show')
    // .attr('display', function(d) {
    //   var parent = d3.select(this).select(function() {
    //     return this.parentNode.parentNode;
    //   });
    //   console.log(parent.attr('fill-opacity') === '0')
    //   if(parent.attr('fill-opacity') === '0')
    //     return 'unset';
    //   else
    //     return 'none';
    //   })

    count = 0;
  //   var clog = d3.selectAll('.node').each(function(d)
  // {
  //   console.log("attr", d3.select(this).attr('display'))
  // })



    var nodeExit = node.exit().transition()
      .duration(duration)
      // .delay(function(d, i) {
      //   if(d.toggle)
      //     return 100* count++;
      //   else {
      //     return 0;
      //   }
      // })
      .ease(d3.easeBackIn) // p2
      .attr('width', 1e-6)
      .attr('height', 1e-6)
      .attr("transform", function(d) {
        if(d.toggle)
        return `translate(${source.x},${source.y})`;
      }) // d.parent.x, d.parent.y to toggle to root
      .remove();

    // *** LINKS **
    var link = g.selectAll('path.link').data(links, function(d) {
      return d.target.data.id;
    });
    count = 0;
    var linkEnter = link.enter().append('path') // or insert
      .attr('class', 'link')
      // .transition()
      // .duration(duration)
      // .delay(d => 100 * count++)
      // .ease(d3.easeBackOut) // p2
      // .attr('stroke-opacity', 1)
      // .attr('d', function(d) {
      //   return linkPathGenerator(d);
      // });

    count = 0;
    var linkUpdate = linkEnter.merge(link).transition()
      .duration(duration) // doesn't work
      // .delay(d => 100 * count++) // works
      // .ease(d3.easeBackOut) // doesn't work
      .attr('d', function(d) {
        return linkPathGenerator(d);
      })
      // .lower();

    count = 0;
    var linkExit = link.exit()
      .transition()
      .duration(duration)
      // .delay(function(d, i) {
      //   if(d.source.toggle || d.target.toggle)
      //     return 100* count++;
      //   else {
      //     return 0;
      //   }
      // })
      .ease(d3.easeBackIn) // p2
      .attr('d', function(d) {
        if(d.source.toggle || d.target.toggle)
          return linkPathGenerator({source: source, target: source});
        // else {
        //   return 0;
        // }
      })
      // .attr('stroke-opacity', 1e-6)
      .remove();
    descendants.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
      d.data.x0 = d.x;
      d.data.y0 = d.y;
    });
    Fnon.Wait.Remove();

  }

//   var x=d3.select('.node').filter(function (d)
// {
//   return d.data.id === source.id;
// }).attr('opacity',0.5);

//d3.select('.node').attr('id',source.data.id).attr('opactiy',0.5);

  // console.log("this is being selected",x.attr('id'));



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

    g.selectAll("path.link")
      .data(allLinks, function(de) {
        return (de.target.data.id === d.data.id || de.source.data.id === d.data.id);
      })
      .remove();

    g.selectAll('.node')
      .data(d.descendants(), de => de.data.id)
      .filter(function(de) {
        if(d.data.id === de.data.id)
          return false;
        return true;
      })
      .remove();

    dragStarted = false;
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

  function expand(d) {
    if(d._children) {
      d._children = d.children;
      d._children.forEach(expand);
      d._children=null;
    }
  }

function toggleChildren(d) {
  if(d.children) {
    // Set toggle state true
    traverse(d, function(d) {
      // console.log("d", d)
      d.data.toggle = true;
      },
      function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
      }
    );

    d._children = d.children;
    d.children = null;
  }
  else if(d._children) {
    // Set toggle state false
    traverse(d, function(d) {
      d.data.toggle = false;
      },
      function(d) {
        return d._children && d._children.length > 0 ? d._children : null;
      }
    );

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
