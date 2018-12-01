define(
  'Events/CheckInCheck/CheckWidget',
  [
    'Events/BaseCard/BaseBlock',
    'tmpl!Events/CheckInCheck/CheckWidget',
    'tmpl!Events/CheckInCheck/CheckWidget/Check',
    'css!Events/CheckInCheck/CheckWidget'
  ],
  function (
    BaseBlock,
    template,
    Check
  ) {
    'use strict';

    var shops = [
      {
        name: "Пятерочка",
        price: 5000
      },

      {
        name: "Магнит",
        price: 1000
      },

      {
        name: "Глобус",
        price: 254
      }
    ];

    var CheckWidget = BaseBlock.extend({
      _dotTplFn: template,
      $protected: {
        _options: {}
      },

      init: function () {
        CheckWidget.superclass.init.apply(this);
        this._initChildren();

        var list = this.getContainer().find(".events-CheckWidget__list");
        for (var i = 0; i < shops.length; i++) {
          list.append(
            Check({
              item: shops[i]
            })
          );
        }

      },

      _initChildren: function () {
        this._children = {};
      }
    });

    return CheckWidget;
  }
);
