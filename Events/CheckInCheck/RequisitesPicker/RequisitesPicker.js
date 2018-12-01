define('Events/CheckInCheck/RequisitesPicker/RequisitesPicker', [
    'SBIS3.CONTROLS/CompoundControl',
    'tmpl!Events/CheckInCheck/RequisitesPicker/RequisitesPicker',

    'SBIS3.CONTROLS/Utils/InformationPopupManager',
    'Core/UserInfo',
    'WS.Data/Source/SbisService',

    'css!Events/CheckInCheck/RequisitesPicker/RequisitesPicker',
],

//Компонент для "Запроса денег"
function(CompoundControl, dotTplFn, InformationPopupManager, UserInfo, SbisService) {

    var RequisitesPicker = CompoundControl.extend({
        _dotTplFn: dotTplFn,
        init: function() {
            RequisitesPicker.superclass.init.call(this);
            
            this.subscribe('onReady', this.onReadyHandler1)
        },



        onReadyHandler1: function(){
            //Добавляем кнопку из шаблона (requisitesSubmitButton)
            var requisitesSubmitButton = this.getChildControlByName('requisitesSubmitButton')
            
            //alert(requisitesSubmitButton.name)
            requisitesSubmitButton.subscribe('onActivated', function (event){
                 message = 'Проверьте свои реквизиты: '
                 
                 var req =  this.getParent().getChildControlByName('myRequisitesTextBox').getText();
                 window.tmpRequisitesPickerRequisiter = req;
                 message = message + req
                 //alert(message)
                 InformationPopupManager.showConfirmDialog({
                     message: message,
                     details: 'Если данные не верны, нажмите «Нет».',
                     opener: this,
                  },

                  this.getParent().AcceptRequisites
                  );
                
                
            })

            
        },

        //Вызывается если пользователь проверил и принял указаные реквизиты
        AcceptRequisites: function (){
            //Получить event id
            //var eventId = '174ce304-ffd4-4b16-9d34-99c87a9334e7';
            var
                eventId = window.sbisEventId,
                self = this,
                membersArray = window.sbisMembers.toArray(),
                members = [];
            membersArray.forEach(function(el) {
                members.push(el.get('Subscriber'));
            });
            //Запрос на получение creditor, debitor, sum
            var requisites = window.tmpRequisitesPickerRequisiter;
            //alert(requisites)
            var debitor = [];
            fetch('/paymentService/get_debitor_list', {
                method: 'post',
                headers: {
                   'Accept': 'application/json',
                   'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventId: eventId,
                    members: members,
                })
             }).then(function(result){
                result.json().then(function(res) {
              
                    for (var k in res) {
                        if (res.hasOwnProperty(k)) {
                            debitor.push({
                                debitor: k,
                                sum: Math.round(res[k].ammount*100)
                            })
                        }
                    }

                    var uISF = UserInfo.get('ИдентификаторСервисаПрофилей');

                    paymentsData = JSON.stringify({
                        event_id: eventId,
                        creditor: uISF,
                        state: 0,
                        debitor,
                        req: requisites,       
                    });
                    fetch('/paymentService/add_payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: paymentsData
                    }).then(result => {
                    }).catch(err => {
                    });

                    for(var i in debitor) {
                        if(debitor.hasOwnProperty(i)) {
                            debugger;
                            self.sendMessage(eventId, requisites, debitor[i].sum, debitor[i].debitor);
                        }
                    }
                })
             });


            //alert(uISF)
            //Отсылаем запрос на добавление платежей
          

        },

        sendMessage: function(eventId, requisites, sum, memberId) {
            function createYandexMoneyURL(requisites, sum) {
                return ("https://money.yandex.ru/transfer?receiver=" + requisites + "&sum=" +
                    sum + "&successURL=https%3A%2F%2Fmoney.yandex.ru%2Fquickpay%2Fbutton-widget%3Ftargets%3D%25D0%259E%25D0%25BF%25D0%25BB%25D0%25B0%25D1%2582%25D0%25B0%2520%25D1%2587%25D0%25B5%25D0%25BA%25D0%25B0%26default-sum%3D" +
                    sum + "%26button-text%3D11%26any-card-payment-type%3Don%26button-size%3Dm%26button-color%3Dorange%26successURL%3D%26quickpay%3Dsmall%26account%3D" +
                    requisites + "&quickpay-back-url=https%3A%2F%2Fmoney.yandex.ru%2Fquickpay%2Fbutton-widget%3Ftargets%3D%25D0%259E%25D0%25BF%25D0%25BB%25D0%25B0%25D1%2582%25D0%25B0%2520%25D1%2587%25D0%25B5%25D0%25BA%25D0%25B0%26default-sum%3D" +
                    sum + "%26button-text%3D11%26any-card-payment-type%3Don%26button-size%3Dm%26button-color%3Dorange%26successURL%3D%26quickpay%3Dsmall%26account%3D"+
                    requisites + "%20чека&form-comment=Оплата%20чека&short-dest=&quickpay-form=small");
            }

            new SbisService({
                endpoint: 'Персона'
            }).call('СОтправить', {
                'Текст':      createYandexMoneyURL(requisites, sum),
                'Документ':   eventId,
                'Диалог':     null,
                'Получатели': memberId,
                'Файлы':      [],
                'Сообщение': null
            }).addCallback(function (res) {
            }).addErrback(function (err) {
            });
        }

    });


    return RequisitesPicker
}
);