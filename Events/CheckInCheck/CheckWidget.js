define(
   'Events/CheckInCheck/CheckWidget',
   [
      'Events/BaseCard/BaseBlock',
      'tmpl!Events/CheckInCheck/CheckWidget',
      'css!Events/CheckInCheck/CheckWidget'
   ],
   function (
      BaseBlock,
      template
   ) {
      'use strict';

      var CheckWidget = BaseBlock.extend({
         _dotTplFn: template,
         $protected: {
            _options: {
            }
         },

         setEnabled: function (value) {
            CheckWidget.superclass.setEnabled.call(this, value);
            this._children.AddCheck.setVisible(value);
         },

         init: function () {
            CheckWidget.superclass.init.apply(this);
            this._initChildren();
         },

         _initChildren: function () {
            this._children = {
            };
         }
      });

      return CheckWidget;
   }
);
