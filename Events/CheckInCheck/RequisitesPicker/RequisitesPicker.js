define('Events/CheckInCheck/RequisitesPicker/RequisitesPicker', [
    'SBIS3.CONTROLS/CompoundControl',
    'tmpl!Events/CheckInCheck/RequisitesPicker/RequisitesPicker',

    'SBIS3.CONTROLS/Utils/InformationPopupManager',
    'Core/UserInfo',

    'css!Events/CheckInCheck/RequisitesPicker/RequisitesPicker',
],

//Компонент для "Запроса денег"
function(CompoundControl, dotTplFn, InformationPopupManager, UserInfo) {

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
            var eventId = window.sbisEventId
            //alert(eventId);

            var membersArray = window.sbisMembers.toArray();
            var members = [];
            membersArray.forEach(function(el) {
                members.push(el.get('Subscriber'));
            })
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
                                sum: Math.round(res[k].ammount)
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
                    })
                    fetch('/paymentService/add_payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: paymentsData
                    }).then(result => {
                        debugger;
                    }).catch(err => {
                        debugger;
                    });
                })
             });




            
            
            //alert(uISF)
            //Отсылаем запрос на добавление платежей
          
            

            
        }

        






    })


    return RequisitesPicker
}
)