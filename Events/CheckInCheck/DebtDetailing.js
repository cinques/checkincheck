define(
   'Events/CheckInCheck/DebtDetailing',
   [
      'Lib/Control/CompoundControl/CompoundControl',
      'tmpl!Events/CheckInCheck/DebtDetailing',
      'css!Events/CheckInCheck/DebtDetailing'
   ],
   function (
      CompoundControl,
      template
   ) {
      'use strict';

      var DebtDetailing = CompoundControl.extend({
         _dotTplFn: template,

         $protected: {
            _options: {
            }
         },

         init: function () {
            DebtDetailing.superclass.init.apply(this);
            this._initChildren();
         },

         _initChildren: function () {
            this._children = {
            };
         }
      });

      return DebtDetailing;
   }
);
