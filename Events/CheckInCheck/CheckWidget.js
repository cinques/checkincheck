define(
  'Events/CheckInCheck/CheckWidget',
  [
    'Events/BaseCard/BaseBlock',
    'tmpl!Events/CheckInCheck/CheckWidget',
    'tmpl!Events/CheckInCheck/CheckWidget/Check',
     'Core/EventBus',
      'Events/CheckInCheck/PayerChoice/PayerChoice',
      'SBIS3.CONTROLS/Action/OpenDialog',
    'css!Events/CheckInCheck/CheckWidget'
  ],
  function (
    BaseBlock,
    template,
    Check,
    EventBus,
    PayerChoice,
    OpenDialog

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

         this.reload();
         this.subscribeTo(
            EventBus.channel('checkChannel'),
            'check.uploaded',
            this.reload.bind(this)
         );
      },

       reload: function () {
          var list = this.getContainer().find(".events-CheckWidget__list");
           var sendPayemntQuery =  this.getChildControlByName('sendPayemntQuery');
           sendPayemntQuery.subscribe('onActivated', this.sendPaymentQueryOnActivated.bind(this));
          list.empty();
          getChecksTotal(this._options.eventId).then(function (result) {
             for (var i = 0; i < result.length; i++) {
                list.append(
                   Check({
                      item: result[i]
                   })
                );
             }
          });
       },
        sendPaymentQueryOnActivated: function(event){
            var options = {
                eventId: this._options.eventId
            };
            new OpenDialog({
                template: 'Events/CheckInCheck/PaymentQuery/PaymentQuery'
            }).execute({
                dialogOptions:     {
                    width: 200,
                    resizeable: false,
                    autoWidth: false,
                    title: "Запрос денег",
                },
                mode: 'dialog',
                componentOptions: options
            })
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
