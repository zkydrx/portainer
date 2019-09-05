angular.module('portainer.app').component('endpointItem', {
  templateUrl: './endpointItem.html',
  bindings: {
    model: '<',
    onSelect: '<',
    onEdit: '<',
    isAdmin:'<'
  },
  controller: 'EndpointItemController'
});
