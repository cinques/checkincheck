define(
   'Events/CheckInCheck/ProductList',
   [
      'Events/BaseCard/BaseBlock',
      'tmpl!Events/CheckInCheck/ProductList',
      'css!Events/CheckInCheck/ProductList'
   ],
   function (
      BaseBlock,
      template
   ) {
      'use strict';

      var ProductList = BaseBlock.extend({
         _dotTplFn: template,

         $protected: {
            _options: {
            }
         },

         init: function () {
            ProductList.superclass.init.apply(this);
            this._initChildren();
         },

         _initChildren: function () {
            this._children = {
            };
         }
      });

      return ProductList;
   }
);
