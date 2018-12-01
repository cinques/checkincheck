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

    var CheckWidget = BaseBlock.extend({
      _dotTplFn: template,
      $protected: {
        _options: {}
      },

      init: function () {
        CheckWidget.superclass.init.apply(this);
        this._initChildren();

        var list = this.getContainer().find(".events-CheckWidget__list");
        getChecksTotal(this._options.eventId).then(function (result) {
          for (var i = 0; i < result.length; i++) {
            list.append(
              Check({
                item: result[i]
              })
            );
          }
        });

        // getChecksTotal(this._options.eventId).then(function (result) {
        //   for(var i = 0; i < result.length; i++) {
        //     new Check({
        //       item: result[i]
        //     })
        //   }
        // })

      },


      _initChildren: function () {
        this._children = {};
      }
    });

    function getChecksTotal(uuId) {
      return fetch('/payments/get_checks_total/' + uuId, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      }).then(function (res) {
        return res.json()
      });
    }

    return CheckWidget;
  }
);
