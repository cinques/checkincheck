define(
   'Events/CheckInCheck/ProductList',
   [
      'Events/BaseCard/BaseBlock',
      'Events/CheckInCheck/ProductList/Product',
      'tmpl!Events/CheckInCheck/ProductList',
      'css!Events/CheckInCheck/ProductList'
   ],
   function (
      BaseBlock,
      Product,
      template
   ) {
      'use strict';

      var data = [{
         name: 'Хлеб'
      }, {
         name: 'Vine'
      }];

      function getData() {
         return new Promise(function (resolve) {
            setTimeout(function () {
               resolve(data);
            }, 500);
         })
      }

      var ProductList = BaseBlock.extend({
         _dotTplFn: template,

         $protected: {
            _options: {
            }
         },

         init: function () {
            ProductList.superclass.init.apply(this);
            this._initChildren();

            getData().then(function (data) {
               data.forEach(function (datum) {
                  new Product({
                     element: $('<div/>').appendTo(this._children.list),
                     item: datum
                  });
               }.bind(this));
            }.bind(this));
         },

         _initChildren: function () {
            this._children = {
               list: this.getContainer().find('.events-ProductList__list')
            };
         }
      });

      return ProductList;
   }
);
