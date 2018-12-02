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
      function sendRequest(eventId, a) {
         return fetch('/payments/get_debitor_list/', {
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  eventId: eventId,
                  members: a
              })
          }).then(function (res) {
              return res.json().then(function (data) {
                  return data[$.cookie('CpsUserId')].ammount;
              })
          });
      }
    var CheckWidget = BaseBlock.extend({
      _dotTplFn: template,
      $protected: {
        _options: {}
      },

      init: function () {
        CheckWidget.superclass.init.apply(this);
        this._initChildren();


          var sendPayemntQuery =  this.getChildControlByName('sendPayemntQuery');
          sendPayemntQuery.subscribe('onActivated', this.sendPaymentQueryOnActivated.bind(this));

         this.reload();
         this.subscribeTo(
            EventBus.channel('checkChannel'),
            'check.uploaded',
            this.reload.bind(this)
         );

      },

       reload: function () {
           var self = this;
           //this.members = a;
           var list = this.getContainer().find(".events-CheckWidget__list");
           var debt = this.getContainer().find(".events-CheckWidget__debt");

            setTimeout(() => {
               var members = this._context.getValue('membersAll');
               var a = [];
               members.each(m => a.push(m.get('Subscriber')));
               sendRequest(this._options.eventId, a).then(function (result) {
                   debt.text(result);
                   self.getChildControlByName('sendPayemntQuery').setVisible(result > 0);
               });
            }, 500);

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
