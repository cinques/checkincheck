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
             var members = this.getChildControlByName("fieldl");
             var dropdown = this.getChildControlByName("dropdownl");
             this.subscribeTo(dropdown, 'onSelectedItemsChange', function (e, idlist) {
                if(idlist[0] == 0) {
                    members.setEnabled(false);
                }
                else {
                    members.setEnabled(true);
                }
             });
             window.kek = members
         },

         _initChildren: function () {
            this._children = {
            };
         }
      });

      return Product;
   }
);
