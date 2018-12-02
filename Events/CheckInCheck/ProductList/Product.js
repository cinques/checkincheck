define(
   'Events/CheckInCheck/ProductList/Product',
   [
      'Lib/Control/CompoundControl/CompoundControl',
      'tmpl!Events/CheckInCheck/ProductList/Product',
      'WS.Data/Collection/RecordSet',
      'Events/BaseCard/Participants/Model',
      'css!Events/CheckInCheck/ProductList/Product'
   ],
   function (
      CompoundControl,
      template,
      RecordSet,
      Model
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
                    members.clearSelectedItems();
                }
                else {
                    members.setEnabled(true);
                }
             });

            var membersAll = this._context.getValue('membersAll');
            var selected = new RecordSet();
            membersAll.each(m => {
               if (~this._options.item.persons.indexOf(m.get('Subscriber'))) {
                  selected.add(new Model({
                     rawData: {
                        Subscriber: m.get("Subscriber"),
                        SubscriberName: m.get('SubscriberName'),
                        SubscriberSurname: m.get('SubscriberSurname')
                     }
                  }));
               }
            });
            selected.getCount() && members.setSelectedItems(selected);


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
