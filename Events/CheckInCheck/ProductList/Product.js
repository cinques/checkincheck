define(
   'Events/CheckInCheck/ProductList/Product',
   [
      'Lib/Control/CompoundControl/CompoundControl',
      'tmpl!Events/CheckInCheck/ProductList/Product',
      'css!Events/CheckInCheck/ProductList/Product'
   ],
   function (
      CompoundControl,
      template
   ) {
      'use strict';

      var Product = CompoundControl.extend({
         _dotTplFn: template,

         $protected: {
            _options: {
            }
         },

         init: function () {
            Product.superclass.init.apply(this);
            this._initChildren();
         },

         _initChildren: function () {
            this._children = {
            };
         }
      });

      return Product;
   }
);
