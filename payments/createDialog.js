require([
   'SBIS3.CONTROLS/Action/OpenDialog'
], function(OpenDialog) {
   var options = {};
   new OpenDialog({
      template: 'MyComponentName'
   }).execute({
      dialogOptions: {
         width: 780,
         resizeable: false,
         autoWidth: false
      },
      mode: 'dialog',
      componentOptions: options
   })
});