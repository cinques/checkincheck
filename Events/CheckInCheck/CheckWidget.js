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
