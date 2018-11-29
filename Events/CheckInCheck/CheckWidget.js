define(
   'Events/CheckInCheck/CheckWidget',
   [
      'Events/BaseCard/BaseBlock',
      'tmpl!Events/CheckInCheck/CheckWidget/Check',
      'tmpl!Events/CheckInCheck/CheckWidget',
      'css!Events/CheckInCheck/CheckWidget'
   ],
   function (
      BaseBlock,
      Check,
      template
   ) {
      'use strict';

      var data = [{
         name: 'Пятерочка'
      }, {
         name: 'Глобус'
      }];

      function getData() {
         return new Promise(function (resolve) {
            setTimeout(function () {
               resolve(data);
            }, 500);
         })
      }

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

            getData().then(function (data) {
               data.forEach(function (datum) {
                  this._children.list.append(Check({item: datum}));
               }.bind(this));
            }.bind(this));
         },

         _initChildren: function () {
            this._children = {
               AddCheck: this.getChildControlByName('AddCheck'),
               list: this.getContainer().find('.events-CheckWidget__list')
            };
         }
      });

      return CheckWidget;
   }
);
