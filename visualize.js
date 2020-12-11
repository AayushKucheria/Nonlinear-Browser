

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

  // const x = svg.attr('width', width)
  //     .attr('height', height)
  //   .append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);


  const root = d3.hierarchy(localRoot);
  // console.log(root)
  const links = treeLayout(root).links();
  const linkPathGenerator = d3.linkVertical()
    .x(d => d.x)
    .y(d => d.y)

  // cost t = svg.transition().duration(2000);

  var tabs = d3.select("tabButton")
    .selectAll('tab')
    .data(root.descendants());

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
          .attr('x', d => d.x)
          .attr('y', d => d.y)
          .style('fill', 'red')
      },
      update => {
        update
        .transition()
        .duration(750)
        .attr('x', d => d.x)
        .attr('y', d => d.y)
      },
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

}
