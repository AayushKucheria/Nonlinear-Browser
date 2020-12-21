window.contextMenu = function(d, menu, openCallback) {
  console.log("Starting custom menu function");
  // Create div element that'll hold the context menu
  d3.selectAll('g.node')
    .enter()
    .append('g')
      .attr('class', 'context_menu')
      .selectAll('tmp')
      .data(menu).enter()
      .append('g')

  // Close Menu
  d3.select('body').on('click.context_menu', function() {
    d3.select('.context_menu').style('display', 'none');
  });

  // This gets executed when a context_menu event occurs
  return function(data, index) {
    console.log("Executing inner function");
    var elem = this;

    d3.selectAll('.context_menu').html('');
    var list = d3.selectAll('.context_menu').append('ul');

    list.selectAll('li').data(menu).enter()
      .append('li')
      .html(function(d) {
        return d.title;
      })
      .on('click', function(event, d) {
        event.action(elem, data, index);
        d3.select('.context_menu').style('display', 'none');
      });

    // openCallback allows an action to fire before the menu is displayed
    // Eg: Closing a tooltip
    if(openCallback) openCallback(data, index);

    d3.select('.context_menu')
      .style('left', (d.pageX - 2) + 'px')
      .style('top', (d.pageY - 2) + 'px')
      .style('display', 'block');

    d.preventDefault();
    d.stopPropogation;
  };
};
